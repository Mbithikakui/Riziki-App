from decimal import Decimal
from django.db import models
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from transactions_app.models import Transaction
from balance_app.models import Balance

from .models import MpesaConfig, ScheduledPayment
from .serializers import (
    MpesaConfigSerializer,
    STKPushSerializer,
    B2CSerializer,
    B2BSerializer,
    C2BRegisterSerializer,
    C2BSimulateSerializer,
    TransactionStatusSerializer,
    ReversalSerializer,
    ScheduledPaymentSerializer,
    CreateScheduledPaymentSerializer,
)
from . import daraja


class MpesaConfigView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        config = MpesaConfig.get_config()
        return Response(MpesaConfigSerializer(config).data)

    def put(self, request):
        config = MpesaConfig.get_config()
        serializer = MpesaConfigSerializer(config, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data)


class STKPushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = STKPushSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()
            print(f"[SECURITY ALERT] Auto-assigned missing transactional passkey '{user_passkey}' to user: {user.username}")

        data = serializer.validated_data
        try:
            # Explicit parameters mapped safely without forwarding raw serializer context values like 'passkey'
            result = daraja.stk_push(
                phone_number=data['phone_number'],
                amount=int(data['amount']),
                account_reference=data['account_reference'],
                transaction_desc=data['transaction_desc'],
                callback_url='',
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        amount_kes_dec = Decimal(str(data['amount']))
        amount_usd_dec = amount_kes_dec / Decimal('150.00')

        # Create pending transaction
        tx = Transaction.objects.create(
            phone_number=data['phone_number'],
            amount_kes=amount_kes_dec,
            amount_usd=amount_usd_dec,
            type='STK_PUSH',
            status='PENDING',
            checkout_request_id=result.get('CheckoutRequestID'),
            merchant_request_id=result.get('MerchantRequestID'),
            description=data['transaction_desc'],
            raw_response=result,
        )

        return Response({
            'message': 'STK Push initiated successfully.',
            'transaction_id': tx.id,
            'checkout_request_id': result.get('CheckoutRequestID'),
            'raw': result,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was detected and generated for your profile: '{user_passkey}'. "
                f"Save this securely as it will not be displayed here again."
            ) if not getattr(user, 'passkey_revealed', True) else None
        }, status=status.HTTP_200_OK)


class B2CView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = B2CSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()
            print(f"[SECURITY ALERT] Auto-assigned missing transactional passkey '{user_passkey}' to user: {user.username}")

        data = serializer.validated_data
        amount_kes = Decimal(str(data['amount']))
        balance = Balance.get_balance()

        if balance.amount_kes < amount_kes:
            return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Clean extraction omitting 'passkey'. Fixed typo from 'occassion' to 'occasion'
            result = daraja.b2c_payment(
                phone_number=data['phone_number'],
                amount=int(amount_kes),
                command_id=data['command_id'],
                remarks=data['remarks'],
                occasion=data.get('occasion', data.get('occassion', '')),
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        balance.debit(amount_kes)
        tx = Transaction.objects.create(
            phone_number=data['phone_number'],
            amount_kes=amount_kes,
            amount_usd=amount_kes / Decimal('150.00'),
            type='B2C',
            status='PENDING',
            description=data['remarks'],
            raw_response=result,
        )

        return Response({
            'message': 'B2C payment initiated.',
            'transaction_id': tx.id,
            'raw': result,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was detected and generated for your profile: '{user_passkey}'. "
                f"Save this securely as it will not be displayed here again."
            ) if not getattr(user, 'passkey_revealed', True) else None
        }, status=status.HTTP_200_OK)


class B2BView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = B2BSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()
            print(f"[SECURITY ALERT] Auto-assigned missing transactional passkey '{user_passkey}' to user: {user.username}")

        data = serializer.validated_data
        amount_kes = Decimal(str(data['amount']))
        balance = Balance.get_balance()

        if balance.amount_kes < amount_kes:
            return Response({'error': 'Insufficient balance.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Explicit mapping to strictly isolate integration logic from validation payloads
            result = daraja.b2b_payment(
                party_b=data['party_b'],
                amount=int(amount_kes),
                command_id=data['command_id'],
                account_reference=data['account_reference'],
                remarks=data['remarks'],
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        balance.debit(amount_kes)
        tx = Transaction.objects.create(
            recipient_name=data['party_b'],
            amount_kes=amount_kes,
            amount_usd=amount_kes / Decimal('150.00'),
            type='B2B',
            status='PENDING',
            description=data['remarks'],
            raw_response=result,
        )

        return Response({
            'message': 'B2B payment initiated.',
            'transaction_id': tx.id,
            'raw': result,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was detected and generated for your profile: '{user_passkey}'. "
                f"Save this securely as it will not be displayed here again."
            ) if not getattr(user, 'passkey_revealed', True) else None
        }, status=status.HTTP_200_OK)


class C2BRegisterView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = C2BRegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()

        data = serializer.validated_data
        try:
            # Isolated parameters to safely exclude any unexpected UI keyword arguments
            result = daraja.register_c2b_url(
                confirmation_url=data['confirmation_url'],
                validation_url=data['validation_url'],
                response_type=data['response_type'],
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'message': 'C2B URLs registered.', 
            'raw': result,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was auto-assigned: '{user_passkey}'."
            ) if not getattr(user, 'passkey_revealed', True) else None
        })


class C2BSimulateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = C2BSimulateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()

        data = serializer.validated_data
        try:
            # Isolated parameters ensuring no stray 'passkey' argument flows downwards
            result = daraja.simulate_c2b(
                amount=int(data['amount']),
                msisdn=data['msisdn'],
                bill_ref_number=data.get('bill_ref_number', 'TEST'),
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            'message': 'C2B simulation triggered.', 
            'raw': result,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was auto-assigned: '{user_passkey}'."
            ) if not getattr(user, 'passkey_revealed', True) else None
        })


class TransactionStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = TransactionStatusSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()

        try:
            result = daraja.transaction_status(
                transaction_id=serializer.validated_data['transaction_id'],
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({'raw': result})


class AccountBalanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = daraja.account_balance()
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({'raw': result})


class ReversalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ReversalSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()
            print(f"[SECURITY ALERT] Auto-assigned missing transactional passkey '{user_passkey}' to user: {user.username}")

        data = serializer.validated_data
        try:
            result = daraja.reverse_transaction(
                transaction_id=data['transaction_id'],
                amount=int(data['amount']),
                remarks=data['remarks'],
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        Transaction.objects.filter(
            mpesa_receipt_number=data['transaction_id']
        ).update(status='REVERSED')

        return Response({
            'message': 'Reversal initiated.', 
            'raw': result,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was auto-assigned: '{user_passkey}'."
            ) if not getattr(user, 'passkey_revealed', True) else None
        })


class STKCallbackView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        body = request.data.get('Body', {})
        stk_callback = body.get('stkCallback', {})
        result_code = stk_callback.get('ResultCode', -1)
        checkout_request_id = stk_callback.get('CheckoutRequestID', '')

        try:
            tx = Transaction.objects.get(checkout_request_id=checkout_request_id)
        except Transaction.DoesNotExist:
            return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

        if result_code == 0:
            items = stk_callback.get('CallbackMetadata', {}).get('Item', [])
            receipt = next((i['Value'] for i in items if i['Name'] == 'MpesaReceiptNumber'), None)
            tx.status = 'SUCCESS'
            tx.mpesa_receipt_number = receipt
            tx.raw_response = stk_callback
            tx.save()
            
            balance = Balance.get_balance()
            balance.credit(Decimal(str(tx.amount_kes)) / Decimal('150.00'))
        else:
            tx.status = 'FAILED'
            tx.raw_response = stk_callback
            tx.save()

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


class B2CResultView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        result = request.data.get('Result', {})
        result_code = result.get('ResultCode', -1)
        transaction_id = result.get('TransactionID', '')

        if result_code == 0:
            Transaction.objects.filter(
                mpesa_receipt_number=transaction_id
            ).update(status='SUCCESS', raw_response=result)
        else:
            Transaction.objects.filter(status='PENDING', type='B2C').order_by('-created_at').first()

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


class ScheduledPaymentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = ScheduledPayment.objects.filter(status='PENDING')
        return Response(ScheduledPaymentSerializer(payments, many=True).data)

    def post(self, request):
        serializer = CreateScheduledPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # ── AUTOMATIC LOOKUP & AUTO-ASSIGN GUARD ──
        user = request.user
        user_passkey = getattr(user, 'passkey_plain', None)
        if not user_passkey or not getattr(user, 'passkey_assigned', False):
            user_passkey = user.reset_passkey()
            print(f"[SECURITY ALERT] Auto-assigned missing transactional passkey '{user_passkey}' to user: {user.username}")

        payment = serializer.save()
        return Response({
            'payment': ScheduledPaymentSerializer(payment).data,
            'auto_assigned_passkey_notice': (
                f"A missing passkey was auto-assigned: '{user_passkey}'."
            ) if not getattr(user, 'passkey_revealed', True) else None
        }, status=status.HTTP_201_CREATED)


class ScheduledPaymentDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            payment = ScheduledPayment.objects.get(pk=pk, status='PENDING')
        except ScheduledPayment.DoesNotExist:
            return Response({'error': 'Scheduled payment not found.'}, status=status.HTTP_404_NOT_FOUND)
        payment.status = 'CANCELLED'
        payment.save()
        return Response({'message': 'Scheduled payment cancelled.'})