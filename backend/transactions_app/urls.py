# backend/transactions_app/urls.py
from django.urls import path
from .views import (
    TransactionListView,
    TransactionDetailView,
    TransactionExportPDFView,
    TransactionPollView,
)

urlpatterns = [
    path('', TransactionListView.as_view(), name='transactions-list'),
    path('<int:pk>/', TransactionDetailView.as_view(), name='transaction-detail'),
    path('export/pdf/', TransactionExportPDFView.as_view(), name='transactions-export-pdf'),
    path('poll/<int:pk>/', TransactionPollView.as_view(), name='transaction-poll'),
]
