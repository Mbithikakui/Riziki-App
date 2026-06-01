# backend/scheduler/tasks.py
"""
Scheduled task definitions — executed by APScheduler.
"""
import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def execute_scheduled_payments():
    """
    Execute all scheduled payments whose scheduled_at time has passed.
    Runs every minute via APScheduler.
    """
    from mpesa_app.models import ScheduledPayment
    from mpesa_app import daraja
    from transactions_app.models import Transaction
    from balance_app.models import Balance

    now = timezone.now()
    pending = ScheduledPayment.objects.filter(
        status='PENDING',
        scheduled_at__lte=now
    )

    for payment in pending:
        logger.info(f"[Scheduler] Executing payment ID={payment.id} type={payment.payment_type}")
        try:
            amount_kes = float(payment.amount_kes)
            balance = Balance.get_balance()

            if float(balance.amount_kes) < amount_kes:
                payment.status = 'FAILED'
                payment.error_message = 'Insufficient balance at time of execution.'
                payment.save()
                logger.warning(f"[Scheduler] Payment {payment.id} failed: insufficient balance.")
                continue

            if payment.payment_type == 'STK_PUSH':
                result = daraja.stk_push(
                    phone_number=payment.phone_number,
                    amount=int(amount_kes),
                    account_reference='Scheduled',
                    transaction_desc=payment.description or 'Scheduled Payment',
                    callback_url='',
                )
            elif payment.payment_type == 'B2C':
                result = daraja.b2c_payment(
                    phone_number=payment.phone_number,
                    amount=int(amount_kes),
                    command_id='BusinessPayment',
                    remarks=payment.description or 'Scheduled B2C',
                )
            elif payment.payment_type == 'B2B':
                result = daraja.b2b_payment(
                    party_b=payment.party_b,
                    amount=int(amount_kes),
                    command_id='BusinessPayBill',
                    account_reference='Scheduled',
                    remarks=payment.description or 'Scheduled B2B',
                )
            else:
                logger.error(f"[Scheduler] Unknown payment type: {payment.payment_type}")
                continue

            # Debit balance
            balance.debit(amount_kes)

            # Record transaction
            Transaction.objects.create(
                phone_number=payment.phone_number,
                recipient_name=payment.party_b,
                amount_kes=payment.amount_kes,
                amount_usd=amount_kes / 150,
                type=payment.payment_type,
                status='PENDING',
                description=payment.description,
                raw_response=result,
            )

            payment.status = 'EXECUTED'
            payment.executed_at = timezone.now()
            payment.save()
            logger.info(f"[Scheduler] Payment {payment.id} executed successfully.")

        except Exception as e:
            payment.status = 'FAILED'
            payment.error_message = str(e)
            payment.save()
            logger.error(f"[Scheduler] Payment {payment.id} failed with error: {e}")


def cleanup_old_transactions():
    """
    Optional: archive or log old failed/cancelled transactions.
    Runs daily.
    """
    from transactions_app.models import Transaction
    from django.utils import timezone
    from datetime import timedelta

    cutoff = timezone.now() - timedelta(days=90)
    old_failed = Transaction.objects.filter(
        status='FAILED',
        created_at__lt=cutoff
    )
    count = old_failed.count()
    if count > 0:
        logger.info(f"[Scheduler] Archiving {count} old failed transactions.")
        old_failed.update(description='[Archived]')
