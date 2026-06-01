# backend/balance_app/urls.py
from django.urls import path
from .views import BalanceView, BalanceHistoryView

urlpatterns = [
    path('', BalanceView.as_view(), name='balance'),
    path('history/', BalanceHistoryView.as_view(), name='balance-history'),
]
