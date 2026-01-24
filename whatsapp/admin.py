from django.contrib import admin
from .models import WhatsappContato, WhatsappConversa, WhatsappMensagem


@admin.register(WhatsappContato)
class WhatsappContatoAdmin(admin.ModelAdmin):
    list_display = ('wa_id', 'nome', 'telefone', 'instance_name')
    search_fields = ('wa_id', 'nome', 'telefone')


@admin.register(WhatsappConversa)
class WhatsappConversaAdmin(admin.ModelAdmin):
    list_display = ('contato', 'instance_name', 'last_message_at', 'unread_count')
    search_fields = ('contato__nome', 'contato__wa_id')


@admin.register(WhatsappMensagem)
class WhatsappMensagemAdmin(admin.ModelAdmin):
    list_display = ('conversa', 'direction', 'status', 'message_type', 'sent_at')
    search_fields = ('text', 'message_id')
    list_filter = ('direction', 'status', 'message_type')
