# backend/receipts_app/views.py
import uuid
import os
from django.core.files.base import ContentFile
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from transactions_app.models import Transaction
from .models import Receipt
from .serializers import ReceiptSerializer
from .utils import generate_receipt_pdf


def _generate_receipt_number() -> str:
    uid = uuid.uuid4().hex[:8].upper()
    return f"RZK-{uid}"


class ReceiptListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        receipts = Receipt.objects.select_related('transaction').all()
        serializer = ReceiptSerializer(receipts, many=True, context={'request': request})
        return Response(serializer.data)


class ReceiptDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            receipt = Receipt.objects.select_related('transaction').get(pk=pk)
        except Receipt.DoesNotExist:
            return Response({'error': 'Receipt not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ReceiptSerializer(receipt, context={'request': request}).data)


class GenerateReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, transaction_id):
        try:
            tx = Transaction.objects.get(pk=transaction_id)
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Reuse existing receipt if present
        if hasattr(tx, 'receipt'):
            return Response(
                ReceiptSerializer(tx.receipt, context={'request': request}).data,
                status=status.HTTP_200_OK
            )

        receipt_number = _generate_receipt_number()
        receipt = Receipt(
            receipt_number=receipt_number,
            admin_name=request.user.full_name or request.user.username,
            transaction=tx,
        )

        # Generate PDF
        pdf_bytes = generate_receipt_pdf(receipt)
        pdf_filename = f"receipt_{receipt_number}.pdf"
        receipt.pdf_file.save(pdf_filename, ContentFile(pdf_bytes), save=False)
        receipt.save()

        return Response(
            ReceiptSerializer(receipt, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class ReceiptDownloadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            receipt = Receipt.objects.get(pk=pk)
        except Receipt.DoesNotExist:
            return Response({'error': 'Receipt not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Regenerate PDF on the fly if no file stored
        pdf_bytes = generate_receipt_pdf(receipt)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="receipt_{receipt.receipt_number}.pdf"'
        return response
