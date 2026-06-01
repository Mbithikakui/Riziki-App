# backend/setup.py
# Run once after migrations to create the default admin user
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(username='Admin').exists():
    user = User.objects.create_superuser(
        username='Admin',
        password='Admin123',
        email='admin@riziki.app',
    )
    user.is_staff      = True
    user.is_superuser  = True
    user.passkey_revealed = False   # Will show passkey on first login
    user.save()
    print(f"✅ Admin user created.")
    print(f"   Username : Admin")
    print(f"   Password : Admin123")
    print(f"   Passkey  : {user.transaction_passkey}  ← shown in app on first login")
else:
    user = User.objects.get(username='Admin')
    print(f"ℹ️  Admin already exists. Passkey: {user.transaction_passkey}")