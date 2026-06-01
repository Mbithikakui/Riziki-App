# backend/auth_app/migrations/0002_adminuser_transaction_passkey.py
from django.db import migrations, models
import auth_app.models


class Migration(migrations.Migration):

    dependencies = [
        ('auth_app', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='adminuser',
            name='transaction_passkey',
            field=models.CharField(
                default=auth_app.models.generate_transaction_passkey,
                help_text='Auto-generated passkey for authorising transactions.',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='adminuser',
            name='passkey_revealed',
            field=models.BooleanField(
                default=False,
                help_text='Tracks whether the passkey has been shown to the user.',
            ),
        ),
    ]