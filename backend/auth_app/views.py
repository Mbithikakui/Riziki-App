import secrets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model

from .serializers import (
    LoginSerializer, PasskeySerializer, ChangePasswordSerializer,
    ChangePasskeySerializer, AdminProfileSerializer,
)

User = get_user_model()

# ---------------------------------------------------------------------------
# Authentication API Endpoints
# ---------------------------------------------------------------------------

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            username=serializer.validated_data['username'],
            password=serializer.validated_data['password'],
        )
        if not user or not user.is_staff:
            return Response(
                {'error': 'Invalid credentials or insufficient privileges.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        # First login — include the plain-text passkey in response (onboarding)
        onboarding_data = None
        if not user.passkey_revealed and user.passkey_assigned:
            onboarding_data = {
                'transaction_passkey': user.passkey_plain,
                'message': (
                    'Your transaction passkey has been generated. '
                    'Save it securely — it will not be shown again. '
                    'Format: RZK followed by 4 digits (e.g. RZK4821).'
                ),
            }
            user.passkey_revealed = True
            user.save(update_fields=['passkey_revealed'])

        return Response({
            'access':     str(refresh.access_token),
            'refresh':    str(refresh),
            'user':       AdminProfileSerializer(user).data,
            'onboarding': onboarding_data,
        })


class LogoutView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
        except Exception:
            pass
        return Response({'message': 'Logged out successfully.'})


# ---------------------------------------------------------------------------
# Transactional Passkey Core Logic Views
# ---------------------------------------------------------------------------

class ValidatePasskeyView(APIView):
    """Validate a submitted transaction passkey against the user's stored hash."""
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = PasskeySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        passkey = serializer.validated_data['passkey'].strip()
        
        # check_passkey() validates against database hash
        if not request.user.check_passkey(passkey):
            return Response(
                {'valid': False, 'error': 'Invalid transaction passkey.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response({'valid': True})


class ChangePasskeyView(APIView):
    """
    Change the transaction passkey manually.
    Current passkey required to authorize the change.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ChangePasskeySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        current = serializer.validated_data['current_passkey'].strip()

        # Validate current passkey against hash before allowing change
        if not user.check_passkey(current):
            return Response(
                {'error': 'Current passkey is incorrect.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_passkey = serializer.validated_data['new_passkey'].strip()
        user.set_passkey(new_passkey)
        return Response({'message': 'Transaction passkey updated successfully.'})


class RegeneratePasskeyView(APIView):
    """
    Generate a brand-new auto-generated passkey system.
    Password confirmation required.
    """
    permission_classes = [IsAdminUser]

    def post(self, request):
        password = request.data.get('password', '').strip()
        if not password or not request.user.check_password(password):
            return Response(
                {'error': 'Password confirmation required to regenerate passkey.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_passkey = request.user.reset_passkey()
        return Response({
            'message': 'New transaction passkey generated. Save it securely — it will not be shown again.',
            'transaction_passkey': new_passkey,
        })


# ---------------------------------------------------------------------------
# User Profile Management Views
# ---------------------------------------------------------------------------

class ChangePasswordView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'message': 'Password changed successfully.'})


class AdminProfileView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(AdminProfileSerializer(request.user).data)

    def patch(self, request):
        serializer = AdminProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ---------------------------------------------------------------------------
# URL Routing Explicit Mappings / Aliases
# ---------------------------------------------------------------------------
SetPasskeyView = ChangePasskeyView