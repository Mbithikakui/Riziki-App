from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "client_type", "phone_number", "till_number", "paybill_number", "account_number", "created_at")
    search_fields = ("name", "phone_number", "till_number", "paybill_number")
    list_filter = ("client_type",)
