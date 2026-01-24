from rest_framework import serializers
from .models import WhatsappContato, WhatsappConversa, WhatsappMensagem


class WhatsappContatoSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappContato
        fields = ['id', 'instance_name', 'wa_id', 'nome', 'telefone', 'avatar_url']


class WhatsappConversaSerializer(serializers.ModelSerializer):
    contato = WhatsappContatoSerializer(read_only=True)

    class Meta:
        model = WhatsappConversa
        fields = [
            'id', 'instance_name', 'contato', 'last_message_text',
            'last_message_at', 'last_message_direction', 'unread_count'
        ]


class WhatsappMensagemSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsappMensagem
        fields = [
            'id', 'conversa', 'message_id', 'direction', 'status',
            'message_type', 'text', 'media_type', 'media_url',
            'mime_type', 'media_caption', 'sent_at', 'created_at'
        ]


class WhatsappSendMessageSerializer(serializers.Serializer):
    texto = serializers.CharField()
