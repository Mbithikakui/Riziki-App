from django.contrib import admin
from .models import Balance

@admin.register(Balance)
class BalanceAdmin(admin.ModelAdmin):
    list_display = ("id", "amount_usd", "amount_kes", "updated_at", "created_at")
    search_fields = ("id",)
