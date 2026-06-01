# backend/mpesa_app/models.py
from django.db import models


class MpesaConfig(models.Model):
    """Stores M-Pesa configuration (single row)."""
    ENVIRONMENT_CHOICES = [
        ('sandbox', 'Sandbox'),
        ('production', 'Production'),
    ]

    consumer_key = models.CharField(max_length=255, blank=True)
    consumer_secret = models.CharField(max_length=255, blank=True)
    shortcode = models.CharField(max_length=20, blank=True)
    passkey = models.CharField(max_length=500, blank=True)
    environment = models.CharField(
        max_length=20,
        choices=ENVIRONMENT_CHOICES,
        default='sandbox'
    )
    callback_url = models.URLField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'mpesa_config'
        verbose_name = 'M-Pesa Config'

    def __str__(self):
        return f"M-Pesa Config [{self.environment}] - {self.shortcode}"

    @classmethod
    def get_config(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ScheduledPayment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('STK_PUSH', 'STK Push'),
        ('B2C', 'B2C'),
        ('B2B', 'B2B'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('EXECUTED', 'Executed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]

    payment_type = models.CharField(max_length=20, choices=PAYMENT_TYPE_CHOICES)
    phone_number = models.CharField(max_length=20, blank=True)
    party_b = models.CharField(max_length=20, blank=True)
    amount_kes = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField(blank=True)
    scheduled_at = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    executed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        db_table = 'scheduled_payments'
        ordering = ['scheduled_at']
        verbose_name = 'Scheduled Payment'
        verbose_name_plural = 'Scheduled Payments'

    def __str__(self):
        return f"[{self.payment_type}] KES {self.amount_kes} at {self.scheduled_at}"
