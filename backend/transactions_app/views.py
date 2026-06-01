# backend/transactions_app/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.http import HttpResponse
from django.utils.dateparse import parse_date

from .models import Transaction
from .serializers import (
    TransactionSerializer,
    DeleteTransactionSerializer,
)
from receipts_app.utils import generate_transactions_pdf


class TransactionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Transaction.objects.all()

        # Filter by type
        tx_type = request.query_params.get('type')
        if tx_type:
            qs = qs.filter(type=tx_type)

        # Filter by status
        tx_status = request.query_params.get('status')
        if tx_status:
            qs = qs.filter(status=tx_status)

        # Filter by date range
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__date__gte=parse_date(date_from))
        if date_to:
            qs = qs.filter(created_at__date__lte=parse_date(date_to))

        serializer = TransactionSerializer(qs, many=True)
        return Response(serializer.data)


class TransactionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            tx = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TransactionSerializer(tx).data)

    def delete(self, request, pk):
        serializer = DeleteTransactionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        if not request.user.check_passkey(serializer.validated_data['passkey']):
            return Response(
                {'error': 'Invalid passkey. Access denied.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            tx = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)

        tx.delete()
        return Response({'message': 'Transaction deleted.'}, status=status.HTTP_200_OK)


class TransactionExportPDFView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        transactions = Transaction.objects.all()
        pdf_buffer = generate_transactions_pdf(transactions)
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="transactions.pdf"'
        return response


class TransactionPollView(APIView):
    """Poll for real-time transaction status updates."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            tx = Transaction.objects.get(pk=pk)
        except Transaction.DoesNotExist:
            return Response({'error': 'Transaction not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response({
            'id': tx.id,
            'status': tx.status,
            'mpesa_receipt_number': tx.mpesa_receipt_number,
            'updated_at': tx.updated_at,
        })
