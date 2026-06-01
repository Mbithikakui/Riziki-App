# backend/balance_app/models.py
from decimal import Decimal
from django.db import models
from django.conf import settings


class Balance(models.Model):
    """
    Stores the current admin wallet balance.
    Maintained as a single-row table updated on every transaction.
    """
    amount_usd = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    amount_kes = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'balance'
        verbose_name = 'Balance'

    def __str__(self):
        return f"Balance: USD {self.amount_usd} | KES {self.amount_kes}"

    @classmethod
    def get_balance(cls):
        """Always returns the single balance instance."""
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def credit(self, amount_usd: Decimal, rate=150.0):
        # Explicit conversion to ensure safe mathematical operations
        dec_amount_usd = Decimal(str(amount_usd))
        dec_rate = Decimal(str(rate))
        calculated_kes = dec_amount_usd * dec_rate

        self.amount_usd += dec_amount_usd
        self.amount_kes += calculated_kes
        self.save()

        BalanceHistory.objects.create(
            balance=self,
            type='CREDIT',
            amount_usd=dec_amount_usd,
            amount_kes=calculated_kes,
            description=f'Credit of USD {dec_amount_usd}',
        )

    def debit(self, amount_kes: Decimal, rate=150.0):
        # Explicit conversion to ensure safe mathematical operations
        dec_amount_kes = Decimal(str(amount_kes))
        dec_rate = Decimal(str(rate))
        calculated_usd = dec_amount_kes / dec_rate

        self.amount_kes -= dec_amount_kes
        self.amount_usd -= calculated_usd
        self.save()

        BalanceHistory.objects.create(
            balance=self,
            type='DEBIT',
            amount_usd=calculated_usd,
            amount_kes=dec_amount_kes,
            description=f'Debit of KES {dec_amount_kes}',
        )


class BalanceHistory(models.Model):
    TYPE_CHOICES = [
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
    ]

    balance = models.ForeignKey(
        Balance,
        on_delete=models.CASCADE,
        related_name='history'
    )
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    amount_usd = models.DecimalField(max_digits=15, decimal_places=2)
    amount_kes = models.DecimalField(max_digits=15, decimal_places=2)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'balance_history'
        ordering = ['-created_at']
        verbose_name = 'Balance History'
        verbose_name_plural = 'Balance History'

    def __str__(self):
        return f"{self.type}: USD {self.amount_usd} at {self.created_at}"