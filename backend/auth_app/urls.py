# backend/auth_app/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView,
    LogoutView,
    AdminProfileView,
    ChangePasswordView,
    ValidatePasskeyView,
    SetPasskeyView,
)

urlpatterns = [
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('profile/', AdminProfileView.as_view(), name='auth-profile'),
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('validate-passkey/', ValidatePasskeyView.as_view(), name='auth-validate-passkey'),
    path('set-passkey/', SetPasskeyView.as_view(), name='auth-set-passkey'),
]
