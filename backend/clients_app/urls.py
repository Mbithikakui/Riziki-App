# backend/clients_app/urls.py
from django.urls import path
from .views import ClientListView, ClientDetailView, ClientPrintView

urlpatterns = [
    path('', ClientListView.as_view(), name='clients-list'),
    path('<int:pk>/', ClientDetailView.as_view(), name='client-detail'),
    path('<int:pk>/print/', ClientPrintView.as_view(), name='client-print'),
]
