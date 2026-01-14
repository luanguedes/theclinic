from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pacientes', '0002_paciente_prioridade'),
    ]

    operations = [
        migrations.AddField(
            model_name='paciente',
            name='aceite_lgpd',
            field=models.BooleanField(default=False),
        ),
    ]
