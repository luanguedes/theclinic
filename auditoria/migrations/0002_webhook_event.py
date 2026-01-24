from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('auditoria', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebhookEvent',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('provider', models.CharField(db_index=True, max_length=50)),
                ('instance_name', models.CharField(db_index=True, max_length=100)),
                ('event_type', models.CharField(blank=True, default='', max_length=100)),
                ('payload', models.JSONField(blank=True, null=True)),
                ('received_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'ordering': ['-received_at'],
            },
        ),
    ]
