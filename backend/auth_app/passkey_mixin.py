# backend/auth_app/passkey_mixin.py
"""
Reusable passkey validation helpers.
Uses AdminUser.check_passkey() which validates against the stored bcrypt hash.
"""
from rest_framework.response import Response
from rest_framework import status


class PasskeyValidationMixin:
    """
    Mixin for DRF views that require transaction passkey validation.

    Usage:
        class MyView(PasskeyValidationMixin, APIView):
            def post(self, request):
                error = self.validate_passkey(request)
                if error:
                    return error
                # proceed with transaction
    """

    def validate_passkey(self, request, field='passkey'):
        submitted = request.data.get(field, '').strip()
        if not submitted:
            return Response(
                {'error': 'Transaction passkey is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # ✅ Uses check_passkey() which validates against bcrypt hash
        if not request.user.check_passkey(submitted):
            return Response(
                {'error': 'Invalid transaction passkey.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        return None


def validate_user_passkey(user, passkey: str):
    """
    Standalone function — validates submitted passkey against user's stored hash.
    Returns (True, None) if valid, (False, error_response) if not.
    """
    if not passkey or not passkey.strip():
        return False, Response(
            {'error': 'Transaction passkey is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    # ✅ check_passkey() uses Django's check_password() against bcrypt hash
    if not user.check_passkey(passkey.strip()):
        return False, Response(
            {'error': 'Invalid transaction passkey.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    return True, None