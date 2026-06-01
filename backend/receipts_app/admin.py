from django.contrib import admin
from .models import Receipt

@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("id", "receipt_number", "admin_name", "created_at")
    search_fields = ("receipt_number", "admin_name")
