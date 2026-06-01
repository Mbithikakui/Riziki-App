# backend/transactions_app/models.py
from django.db import models


class Transaction(models.Model):
    TYPE_CHOICES = [
        ('STK_PUSH', 'STK Push'),
        ('B2C', 'Business to Customer'),
        ('B2B', 'Business to Business'),
        ('C2B', 'Customer to Business'),
        ('REVERSAL', 'Reversal'),
        ('BALANCE_QUERY', 'Balance Query'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
        ('REVERSED', 'Reversed'),
        ('CANCELLED', 'Cancelled'),
    ]

    mpesa_receipt_number = models.CharField(max_length=50, null=True, blank=True)
    checkout_request_id = models.CharField(max_length=100, null=True, blank=True)
    merchant_request_id = models.CharField(max_length=100, null=True, blank=True)
    phone_number = models.CharField(max_length=20, null=True, blank=True)
    recipient_name = models.CharField(max_length=255, null=True, blank=True)
    amount_kes = models.DecimalField(max_digits=15, decimal_places=2)
    amount_usd = models.DecimalField(max_digits=15, decimal_places=6, default=0)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    description = models.TextField(null=True, blank=True)
    raw_response = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'transactions'
        ordering = ['-created_at']
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'

    def __str__(self):
        return f"[{self.type}] {self.status} - KES {self.amount_kes} | {self.created_at}"
