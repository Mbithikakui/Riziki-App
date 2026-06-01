from decimal import Decimal
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import Balance, BalanceHistory
from .serializers import BalanceSerializer, BalanceHistorySerializer, AddBalanceSerializer


class BalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retrieve current balance."""
        balance = Balance.get_balance()
        return Response(BalanceSerializer(balance).data)

    def post(self, request):
        """Add funds to balance."""
        serializer = AddBalanceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        
        # If no key exists or the assignment flag is missing, auto-assign instead of blocking
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            # Safe runtime fallback generation using your secure model utility
            user_passkey = user.reset_passkey()
            
            # Optional console notice or logging for security audits
            print(f"[SECURITY ALERT] Auto-assigned missing transactional passkey '{user_passkey}' to user: {user.username}")

        # ── FIXED: Convert explicitly to Decimal instead of float ──
        amount_usd = Decimal(str(serializer.validated_data['amount_usd']))
        rate = Decimal(str(serializer.validated_data.get('conversion_rate', 150.00)))

        balance = Balance.get_balance()
        balance.credit(amount_usd, rate)

        return Response({
            'message': f'Successfully added USD {amount_usd} to balance.',
            'balance': BalanceSerializer(balance).data,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was detected and generated for your profile: '{user_passkey}'. "
                f"Save this securely as it will not be displayed here again."
            ) if not getattr(user, 'passkey_revealed', True) else None
        }, status=status.HTTP_200_OK)


class BalanceHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retrieve balance history."""
        history = BalanceHistory.objects.select_related('balance').order_by('-created_at')[:100]
        return Response(BalanceHistorySerializer(history, many=True).data)