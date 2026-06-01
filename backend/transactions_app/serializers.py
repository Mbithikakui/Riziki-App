# backend/transactions_app/serializers.py
from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = [
            'id', 'mpesa_receipt_number', 'checkout_request_id',
            'merchant_request_id', 'phone_number', 'recipient_name',
            'amount_kes', 'amount_usd', 'type', 'status',
            'description', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class TransactionFilterSerializer(serializers.Serializer):
    type = serializers.ChoiceField(
        choices=[c[0] for c in Transaction.TYPE_CHOICES],
        required=False
    )
    status = serializers.ChoiceField(
        choices=[c[0] for c in Transaction.STATUS_CHOICES],
        required=False
    )
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)


class DeleteTransactionSerializer(serializers.Serializer):
    passkey = serializers.CharField(write_only=True)
