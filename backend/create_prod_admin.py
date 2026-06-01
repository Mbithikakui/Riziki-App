import os
import django

# Initialize Django environment settings layout
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

def create_superuser():
    username = 'Richkid1'
    email = 'admin@rizikiapp.com'
    password = 'DeRZK8301'  # <-- Change this to your preferred password
    
    if not User.objects.filter(username=username).exists():
        print(f"Creating production superuser account: {username}...")
        User.objects.create_superuser(
            username=username, 
            email=email, 
            password=password,
            is_staff=True,
            is_superuser=True,
            is_active=True
        )
        print("Superuser created successfully!")
    else:
        print(f"Superuser account '{username}' already exists. Updating credentials...")
        user = User.objects.get(username=username)
        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save()
        print("Credentials updated safely.")

if __name__ == '__main__':
    create_superuser()