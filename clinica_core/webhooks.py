import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from auditoria.models import WebhookEvent
from whatsapp.services import process_webhook_event


logger = logging.getLogger(__name__)


class EvolutionWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, instance_name):
        payload = request.data
        if not payload:
            payload = request.body.decode('utf-8', errors='ignore') if request.body else None
        event_type = ''
        if isinstance(payload, dict):
            event_type = payload.get('event') or payload.get('type') or ''
        WebhookEvent.objects.create(
            provider='evolution',
            instance_name=instance_name,
            event_type=event_type,
            payload=payload if isinstance(payload, dict) else {'raw': payload}
        )
        if isinstance(payload, dict):
            try:
                process_webhook_event(payload, instance_name)
            except Exception as exc:
                logger.exception(f"Erro ao processar webhook Evolution: {exc}")
        return Response({'status': 'ok'}, status=status.HTTP_200_OK)

    def get(self, request, instance_name):
        return Response({'status': 'ok', 'instance': instance_name})
