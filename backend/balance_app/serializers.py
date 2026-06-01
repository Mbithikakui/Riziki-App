# backend/balance_app/serializers.py
from rest_framework import serializers
from .models import Balance, BalanceHistory


class BalanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Balance
        fields = ['id', 'amount_usd', 'amount_kes', 'updated_at', 'created_at']
        read_only_fields = ['id', 'amount_kes', 'updated_at', 'created_at']


class BalanceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BalanceHistory
        fields = ['id', 'type', 'amount_usd', 'amount_kes', 'description', 'created_at']
        read_only_fields = fields


class AddBalanceSerializer(serializers.Serializer):
    amount_usd = serializers.DecimalField(
        max_digits=15,
        decimal_places=2,
        min_value=0.01
    )
    passkey = serializers.CharField(write_only=True)
    conversion_rate = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=150.00,
        required=False
    )
