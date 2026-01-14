from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0006_operador_theme_preference'),
    ]

    operations = [
        migrations.AddField(
            model_name='operador',
            name='acesso_whatsapp',
            field=models.BooleanField(default=False, verbose_name='Acesso WhatsApp'),
        ),
    ]
