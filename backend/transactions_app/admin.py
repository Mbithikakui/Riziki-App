from django.contrib import admin
from .models import Transaction

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "phone_number", "recipient_name", "amount_kes", "amount_usd", "status", "created_at")
    search_fields = ("phone_number", "recipient_name", "mpesa_receipt_number")
    list_filter = ("status", "type")
