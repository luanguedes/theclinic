from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from django.utils import timezone

from configuracoes.models import ConfiguracaoSistema
from .models import WhatsappConversa, WhatsappMensagem
from .serializers import (
    WhatsappConversaSerializer,
    WhatsappMensagemSerializer,
    WhatsappSendMessageSerializer
)
from .services import can_send_message, send_text_message


def _has_whatsapp_access(user):
    return bool(user and (getattr(user, 'is_superuser', False) or getattr(user, 'acesso_whatsapp', False)))


class WhatsappConversaViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = WhatsappConversaSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['contato__nome', 'contato__wa_id', 'contato__telefone']

    def get_queryset(self):
        instance_name = settings.EVOLUTION_INSTANCE_NAME
        return WhatsappConversa.objects.select_related('contato').filter(instance_name=instance_name)

    def list(self, request, *args, **kwargs):
        if not _has_whatsapp_access(request.user):
            return Response({'error': 'Sem permissao.'}, status=status.HTTP_403_FORBIDDEN)
        return super().list(request, *args, **kwargs)

    def retrieve(self, request, *args, **kwargs):
        if not _has_whatsapp_access(request.user):
            return Response({'error': 'Sem permissao.'}, status=status.HTTP_403_FORBIDDEN)
        return super().retrieve(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def mensagens(self, request, pk=None):
        if not _has_whatsapp_access(request.user):
            return Response({'error': 'Sem permissao.'}, status=status.HTTP_403_FORBIDDEN)

        conversa = self.get_object()
        queryset = conversa.mensagens.all().order_by('sent_at', 'created_at')
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = WhatsappMensagemSerializer(page, many=True)
            conversa.unread_count = 0
            conversa.save(update_fields=['unread_count'])
            return self.get_paginated_response(serializer.data)

        serializer = WhatsappMensagemSerializer(queryset, many=True)
        conversa.unread_count = 0
        conversa.save(update_fields=['unread_count'])
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def enviar(self, request, pk=None):
        if not _has_whatsapp_access(request.user):
            return Response({'error': 'Sem permissao.'}, status=status.HTTP_403_FORBIDDEN)

        conversa = self.get_object()
        serializer = WhatsappSendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        texto = serializer.validated_data['texto']

        config = ConfiguracaoSistema.load()
        if not config.enviar_whatsapp_global:
            return Response({'error': 'WhatsApp global desativado.'}, status=status.HTTP_400_BAD_REQUEST)

        if not can_send_message(conversa):
            return Response({
                'error': 'Janela de 24h expirada. Envie um template aprovado.',
                'requires_template': True
            }, status=status.HTTP_400_BAD_REQUEST)

        response = send_text_message(conversa, texto)
        status_code = response.status_code
        if status_code not in [200, 201]:
            return Response({
                'error': 'Falha ao enviar mensagem.',
                'details': response.text
            }, status=status.HTTP_400_BAD_REQUEST)

        sent_at = timezone.now()
        WhatsappMensagem.objects.create(
            conversa=conversa,
            message_id='',
            direction='out',
            status='sent',
            message_type='text',
            text=texto,
            sent_at=sent_at
        )

        conversa.last_message_text = texto
        conversa.last_message_direction = 'out'
        conversa.last_message_at = sent_at
        conversa.save(update_fields=['last_message_text', 'last_message_direction', 'last_message_at', 'atualizado_em'])

        return Response({'status': 'sent'})
