# backend/receipts_app/models.py
from django.db import models
from transactions_app.models import Transaction


class Receipt(models.Model):
    receipt_number = models.CharField(max_length=50, unique=True)
    admin_name = models.CharField(max_length=255)
    transaction = models.OneToOneField(
        Transaction,
        on_delete=models.CASCADE,
        related_name='receipt'
    )
    pdf_file = models.FileField(upload_to='receipts/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'receipts'
        ordering = ['-created_at']
        verbose_name = 'Receipt'
        verbose_name_plural = 'Receipts'

    def __str__(self):
        return f"Receipt {self.receipt_number} - {self.admin_name}"

    @property
    def pdf_url(self):
        if self.pdf_file:
            return self.pdf_file.url
        return None
