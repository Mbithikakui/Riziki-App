from django.contrib import admin
from .models import MpesaConfig, ScheduledPayment

@admin.register(MpesaConfig)
class MpesaConfigAdmin(admin.ModelAdmin):
    list_display = ("id", "shortcode", "environment", "callback_url", "updated_at")

@admin.register(ScheduledPayment)
class ScheduledPaymentAdmin(admin.ModelAdmin):
    list_display = ("id", "payment_type", "phone_number", "party_b", "amount_kes", "status", "scheduled_at", "executed_at")
    list_filter = ("status", "payment_type")
