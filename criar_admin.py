import os
import django
from django.contrib.auth import get_user_model

# Configura o ambiente Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "clinica_core.settings")
django.setup()

User = get_user_model()

username = os.environ.get("DJANGO_SUPERUSER_USERNAME", "admin")
email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "admin@admin.com")
password = os.environ.get("DJANGO_SUPERUSER_PASSWORD", "admin123")

if not User.objects.filter(username=username).exists():
    print(f"Criando superusuário: {username}")
    User.objects.create_superuser(username, email, password)
else:
    print(f"Superusuário {username} já existe. Ignorando criação.")