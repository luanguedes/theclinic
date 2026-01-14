from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0005_privilegio_operador_privilegios'),
    ]

    operations = [
        migrations.AddField(
            model_name='operador',
            name='theme_preference',
            field=models.CharField(
                choices=[('light', 'Claro'), ('dark', 'Escuro')],
                default='light',
                max_length=10,
                verbose_name='Tema Padrão',
            ),
        ),
    ]

