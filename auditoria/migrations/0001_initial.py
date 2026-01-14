from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('action', models.CharField(choices=[('CREATE', 'CREATE'), ('UPDATE', 'UPDATE'), ('DELETE', 'DELETE'), ('REPORT_VIEW', 'REPORT_VIEW')], db_index=True, max_length=20)),
                ('method', models.CharField(blank=True, default='', max_length=10)),
                ('path', models.CharField(blank=True, default='', max_length=255)),
                ('status_code', models.IntegerField(blank=True, null=True)),
                ('operator_username', models.CharField(blank=True, default='', max_length=150)),
                ('operator_name', models.CharField(blank=True, default='', max_length=150)),
                ('app_label', models.CharField(blank=True, default='', max_length=100)),
                ('model_name', models.CharField(blank=True, default='', max_length=100)),
                ('object_id', models.CharField(blank=True, default='', max_length=64)),
                ('object_repr', models.CharField(blank=True, default='', max_length=255)),
                ('summary', models.CharField(blank=True, default='', max_length=255)),
                ('before', models.JSONField(blank=True, null=True)),
                ('after', models.JSONField(blank=True, null=True)),
                ('diff', models.JSONField(blank=True, null=True)),
                ('ip_address', models.CharField(blank=True, default='', max_length=45)),
                ('user_agent', models.CharField(blank=True, default='', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('operator', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL)),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]
