from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import AdminUser


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError('Invalid username or password.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been disabled.')
        attrs['user'] = user
        return attrs


class UserSerializer(serializers.ModelSerializer):
    # ✅ Expose passkey assignment state to frontend context
    passkey_assigned = serializers.SerializerMethodField()

    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'full_name', 'email', 'is_staff', 'passkey_assigned', 'created_at']
        read_only_fields = ['id', 'username', 'is_staff', 'created_at']

    def get_passkey_assigned(self, obj):
        # Checks if the model has a plain or hashed passkey set
        return bool(getattr(obj, 'passkey_plain', None) or getattr(obj, 'passkey_hash', None))


class AdminProfileSerializer(serializers.ModelSerializer):
    # ✅ Expose passkey assignment state to frontend context
    passkey_assigned = serializers.SerializerMethodField()

    class Meta:
        model = AdminUser
        fields = ['id', 'username', 'full_name', 'email', 'is_staff', 'passkey_assigned', 'created_at']
        read_only_fields = ['id', 'username', 'is_staff', 'created_at']

    def get_passkey_assigned(self, obj):
        return bool(getattr(obj, 'passkey_plain', None) or getattr(obj, 'passkey_hash', None))


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminUser
        fields = ['full_name', 'email']

    def validate_email(self, value):
        user = self.context['request'].user
        if AdminUser.objects.exclude(pk=user.pk).filter(email=value).exists():
            raise serializers.ValidationError('This email is already in use.')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=6)
    confirm_password = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['confirm_password']:
            raise serializers.ValidationError('New passwords do not match.')
        return attrs

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class ValidatePasskeySerializer(serializers.Serializer):
    passkey = serializers.CharField(required=True, write_only=True)


class ChangePasskeySerializer(serializers.Serializer):
    current_passkey = serializers.CharField(required=True, write_only=True)
    new_passkey = serializers.CharField(required=True, write_only=True, min_length=4)
    confirm_passkey = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['new_passkey'] != attrs['confirm_passkey']:
            raise serializers.ValidationError('New passkeys do not match.')
        return attrs


class SetPasskeySerializer(serializers.Serializer):
    passkey = serializers.CharField(required=True, write_only=True, min_length=4)
    confirm_passkey = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs['passkey'] != attrs['confirm_passkey']:
            raise serializers.ValidationError('Passkeys do not match.')
        return attrs


# ---------------------------------------------------------------------------
# View Explicit Mappings/Aliases
# ---------------------------------------------------------------------------
PasskeySerializer = ValidatePasskeySerializer