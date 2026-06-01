# backend/mpesa_app/urls.py
from django.urls import path
from .views import (
    MpesaConfigView,
    STKPushView,
    B2CView,
    B2BView,
    C2BRegisterView,
    C2BSimulateView,
    TransactionStatusView,
    AccountBalanceView,
    ReversalView,
    STKCallbackView,
    B2CResultView,
    ScheduledPaymentListView,
    ScheduledPaymentDetailView,
)

urlpatterns = [
    # Core Configurations & Status Queries
    path('config/', MpesaConfigView.as_view(), name='mpesa-config'),
    path('status/', TransactionStatusView.as_view(), name='mpesa-status'),
    path('balance/', AccountBalanceView.as_view(), name='mpesa-balance'),
    path('reversal/', ReversalView.as_view(), name='mpesa-reversal'),

    # Payment Initiation Outbound Gateways
    path('stk-push/', STKPushView.as_view(), name='mpesa-stk-push'),
    path('b2c/', B2CView.as_view(), name='mpesa-b2c'),
    path('b2b/', B2BView.as_view(), name='mpesa-b2b'),
    
    # C2B URLs Generation Gateways
    path('c2b/register/', C2BRegisterView.as_view(), name='mpesa-c2b-register'),
    path('c2b/simulate/', C2BSimulateView.as_view(), name='mpesa-c2b-simulate'),

    # Async Inbound Webhook / Callback Listeners
    path('callback/', STKCallbackView.as_view(), name='mpesa-stk-callback'),
    
    # B2C Callbacks (Handles result and timeout webhooks)
    path('b2c/result/', B2CResultView.as_view(), name='mpesa-b2c-result'),
    path('b2c/timeout/', B2CResultView.as_view(), name='mpesa-b2c-timeout'),
    
    # B2B Callbacks (Handles result and timeout webhooks)
    path('b2b/result/', B2CResultView.as_view(), name='mpesa-b2b-result'),
    path('b2b/timeout/', B2CResultView.as_view(), name='mpesa-b2b-timeout'),

    # Standing Orders / Scheduled Disbursals
    path('scheduled/', ScheduledPaymentListView.as_view(), name='mpesa-scheduled-list'),
    path('scheduled/<int:pk>/', ScheduledPaymentDetailView.as_view(), name='mpesa-scheduled-detail'),
]