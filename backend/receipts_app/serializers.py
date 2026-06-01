# backend/receipts_app/serializers.py
from rest_framework import serializers
from .models import Receipt
from transactions_app.serializers import TransactionSerializer


class ReceiptSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer(read_only=True)
    pdf_url = serializers.SerializerMethodField()

    class Meta:
        model = Receipt
        fields = [
            'id', 'receipt_number', 'admin_name',
            'transaction', 'pdf_file', 'pdf_url', 'created_at',
        ]
        read_only_fields = fields

    def get_pdf_url(self, obj):
        request = self.context.get('request')
        if obj.pdf_file and request:
            return request.build_absolute_uri(obj.pdf_file.url)
        return None
