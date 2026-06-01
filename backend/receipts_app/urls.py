# backend/receipts_app/urls.py
from django.urls import path
from .views import (
    ReceiptListView,
    ReceiptDetailView,
    GenerateReceiptView,
    ReceiptDownloadView,
)

urlpatterns = [
    path('', ReceiptListView.as_view(), name='receipts-list'),
    path('<int:pk>/', ReceiptDetailView.as_view(), name='receipt-detail'),
    path('generate/<int:transaction_id>/', GenerateReceiptView.as_view(), name='receipt-generate'),
    path('<int:pk>/download/', ReceiptDownloadView.as_view(), name='receipt-download'),
]
