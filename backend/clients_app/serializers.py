# backend/clients_app/serializers.py
from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'phone_number', 'till_number',
            'paybill_number', 'account_number', 'client_type',
            'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, attrs):
        client_type = attrs.get('client_type', '')
        if client_type == 'PHONE' and not attrs.get('phone_number'):
            raise serializers.ValidationError({'phone_number': 'Phone number is required for PHONE type.'})
        if client_type == 'TILL' and not attrs.get('till_number'):
            raise serializers.ValidationError({'till_number': 'Till number is required for TILL type.'})
        if client_type == 'PAYBILL' and not attrs.get('paybill_number'):
            raise serializers.ValidationError({'paybill_number': 'Paybill number is required for PAYBILL type.'})
        return attrs


class DeleteClientSerializer(serializers.Serializer):
    passkey = serializers.CharField(write_only=True)
