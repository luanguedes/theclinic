from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='WhatsappContato',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('instance_name', models.CharField(db_index=True, max_length=100)),
                ('wa_id', models.CharField(db_index=True, max_length=150)),
                ('nome', models.CharField(blank=True, default='', max_length=255)),
                ('telefone', models.CharField(blank=True, default='', max_length=30)),
                ('avatar_url', models.URLField(blank=True, default='')),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
            ],
            options={
                'ordering': ['nome', 'wa_id'],
                'unique_together': {('instance_name', 'wa_id')},
            },
        ),
        migrations.CreateModel(
            name='WhatsappConversa',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('instance_name', models.CharField(db_index=True, max_length=100)),
                ('last_message_text', models.TextField(blank=True, default='')),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('last_message_direction', models.CharField(blank=True, default='', max_length=10)),
                ('unread_count', models.IntegerField(default=0)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('contato', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='conversas', to='whatsapp.whatsappcontato')),
            ],
            options={
                'ordering': ['-last_message_at', '-atualizado_em'],
                'unique_together': {('instance_name', 'contato')},
            },
        ),
        migrations.CreateModel(
            name='WhatsappMensagem',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('message_id', models.CharField(blank=True, db_index=True, default='', max_length=200)),
                ('direction', models.CharField(choices=[('in', 'Recebida'), ('out', 'Enviada')], default='in', max_length=10)),
                ('status', models.CharField(choices=[('pending', 'Pendente'), ('sent', 'Enviada'), ('delivered', 'Entregue'), ('read', 'Lida'), ('failed', 'Falhou')], default='sent', max_length=20)),
                ('message_type', models.CharField(choices=[('text', 'Texto'), ('media', 'Midia'), ('system', 'Sistema')], default='text', max_length=20)),
                ('text', models.TextField(blank=True, default='')),
                ('media_type', models.CharField(blank=True, default='', max_length=50)),
                ('media_url', models.URLField(blank=True, default='')),
                ('mime_type', models.CharField(blank=True, default='', max_length=100)),
                ('media_caption', models.TextField(blank=True, default='')),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversa', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='mensagens', to='whatsapp.whatsappconversa')),
            ],
            options={
                'ordering': ['-sent_at', '-created_at'],
            },
        ),
    ]
