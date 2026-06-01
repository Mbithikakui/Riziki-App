# backend/scheduler/scheduler.py
"""
APScheduler configuration and startup.
Call start() from AppConfig.ready() in any app.
"""
import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from django_apscheduler.jobstores import DjangoJobStore
from django_apscheduler.models import DjangoJobExecution

logger = logging.getLogger(__name__)

_scheduler = None


def start():
    global _scheduler
    if _scheduler and _scheduler.running:
        logger.info('[Scheduler] Already running.')
        return

    _scheduler = BackgroundScheduler(timezone='Africa/Nairobi')
    _scheduler.add_jobstore(DjangoJobStore(), 'default')

    from scheduler.tasks import execute_scheduled_payments, cleanup_old_transactions

    # Run every 60 seconds — check for due scheduled payments
    _scheduler.add_job(
        execute_scheduled_payments,
        trigger=IntervalTrigger(seconds=60),
        id='execute_scheduled_payments',
        name='Execute Scheduled M-Pesa Payments',
        replace_existing=True,
        jobstore='default',
        misfire_grace_time=60,
    )

    # Run daily at 2 AM Nairobi time — cleanup old transactions
    _scheduler.add_job(
        cleanup_old_transactions,
        trigger=CronTrigger(hour=2, minute=0, timezone='Africa/Nairobi'),
        id='cleanup_old_transactions',
        name='Cleanup Old Failed Transactions',
        replace_existing=True,
        jobstore='default',
        misfire_grace_time=300,
    )

    _scheduler.start()
    logger.info('[Scheduler] APScheduler started successfully.')


def shutdown():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info('[Scheduler] APScheduler shut down.')


def delete_old_job_executions(max_age=604_800):
    """Delete job execution logs older than max_age seconds (default: 7 days)."""
    DjangoJobExecution.objects.delete_old_job_executions(max_age)
