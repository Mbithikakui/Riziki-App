from rest_framework import serializers
from .models import MpesaConfig, ScheduledPayment


class MpesaConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaConfig
        fields = [
            'id', 'consumer_key', 'consumer_secret', 'shortcode',
            'passkey', 'environment', 'callback_url', 'updated_at',
        ]
        extra_kwargs = {
            'consumer_secret': {'write_only': True},
            'passkey': {'write_only': True},
        }


class STKPushSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    account_reference = serializers.CharField(max_length=100)
    transaction_desc = serializers.CharField(max_length=255)


class B2CSerializer(serializers.Serializer):
    COMMAND_CHOICES = ['SalaryPayment', 'BusinessPayment', 'PromotionPayment']
    phone_number = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    command_id = serializers.ChoiceField(choices=COMMAND_CHOICES)
    remarks = serializers.CharField(max_length=255)
    occassion = serializers.CharField(max_length=255, required=False, default='')


class B2BSerializer(serializers.Serializer):
    party_b = serializers.CharField(max_length=20)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    command_id = serializers.CharField(max_length=100)
    account_reference = serializers.CharField(max_length=100)
    remarks = serializers.CharField(max_length=255)


class C2BRegisterSerializer(serializers.Serializer):
    confirmation_url = serializers.URLField()
    validation_url = serializers.URLField()
    response_type = serializers.ChoiceField(choices=['Completed', 'Cancelled'], default='Completed')


class C2BSimulateSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    msisdn = serializers.CharField(max_length=20)
    bill_ref_number = serializers.CharField(max_length=50, required=False, default='TEST')


class TransactionStatusSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(max_length=50)


class ReversalSerializer(serializers.Serializer):
    transaction_id = serializers.CharField(max_length=50)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=1)
    remarks = serializers.CharField(max_length=255)


class ScheduledPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledPayment
        fields = [
            'id', 'payment_type', 'phone_number', 'party_b',
            'amount_kes', 'description', 'scheduled_at',
            'status', 'created_at', 'executed_at',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'executed_at']


class CreateScheduledPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledPayment
        fields = [
            'payment_type', 'phone_number', 'party_b',
            'amount_kes', 'description', 'scheduled_at',
        ]