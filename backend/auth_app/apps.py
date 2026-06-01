# backend/auth_app/apps.py
from django.apps import AppConfig


class AuthAppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'auth_app'

    def ready(self):
        import os
        # Only start scheduler in the main process, not during migrations
        if os.environ.get('RUN_MAIN', None) != 'true':
            return
        try:
            from scheduler.scheduler import start
            start()
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f'Scheduler startup error: {e}')
