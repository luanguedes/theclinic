from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pacientes', '0003_paciente_aceite_lgpd'),
    ]

    operations = [
        migrations.AddField(
            model_name='paciente',
            name='email',
            field=models.EmailField(blank=True, max_length=254, null=True),
        ),
    ]
