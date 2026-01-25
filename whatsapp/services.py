import logging
import re
from datetime import timedelta

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import WhatsappContato, WhatsappConversa, WhatsappMensagem

logger = logging.getLogger(__name__)


MEDIA_MESSAGE_KEYS = [
    'imageMessage',
    'videoMessage',
    'documentMessage',
    'audioMessage',
    'stickerMessage',
]


def _get_event_type(payload):
    if isinstance(payload, dict):
        return payload.get('event') or payload.get('type') or ''
    return ''


def _extract_messages(payload):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []

    data = payload.get('data')
    if isinstance(data, dict) and isinstance(data.get('messages'), list):
        return data.get('messages')
    if isinstance(data, dict) and (data.get('key') or data.get('message')):
        return [data]
    if isinstance(data, list):
        return data
    if isinstance(payload.get('messages'), list):
        return payload.get('messages')
    if payload.get('key') or payload.get('message'):
        return [payload]
    return []


def _extract_updates(payload):
    if not isinstance(payload, dict):
        return []
    data = payload.get('data')
    if isinstance(data, list):
        return data
    if isinstance(payload.get('updates'), list):
        return payload.get('updates')
    return []


def _extract_event_items(payload):
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    data = payload.get('data')
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        return [data]
    return []


def _extract_contact_jid(item):
    if not isinstance(item, dict):
        return ''
    for key in ['jid', 'id', 'remoteJid', 'wa_id', 'waId', 'contactJid']:
        value = item.get(key)
        if value:
            return str(value)
    return ''


def _extract_contact_name(item):
    if not isinstance(item, dict):
        return ''
    return item.get('name') or item.get('notify') or item.get('pushName') or item.get('verifiedName') or ''


def _extract_contact_number(item, jid):
    if not isinstance(item, dict):
        return ''
    lid_number = ''
    if jid and jid.endswith('@lid'):
        lid_number = jid.split('@')[0]
    for key in ['number', 'phone', 'phoneNumber', 'whatsappNumber']:
        value = item.get(key)
        if value:
            number = str(value)
            if lid_number and number == lid_number:
                return ''
            return number
    for key in ['sender', 'participant', 'participantJid', 'participantId', 'author']:
        value = item.get(key)
        if value:
            number = normalize_phone(value)
            if number and number != lid_number:
                return number
    if jid and jid.endswith('@s.whatsapp.net'):
        return jid.split('@')[0]
    return ''


def _normalize_wa_id(remote_jid):
    if not remote_jid:
        return ''
    return str(remote_jid)


def _extract_phone(wa_id):
    if not wa_id:
        return ''
    if wa_id.endswith('@lid'):
        return ''
    raw = wa_id.split('@')[0]
    return re.sub(r'\D', '', raw)


def _pick_phone_override(candidates, lid_number, owner_number):
    for value in candidates:
        if not value:
            continue
        number = normalize_phone(value)
        if not number:
            continue
        if lid_number and number == lid_number:
            continue
        if owner_number and number == owner_number:
            continue
        return number
    return ''


def normalize_phone(phone):
    if not phone:
        return ''
    digits = re.sub(r'\D', '', str(phone))
    if not digits:
        return ''
    if digits.startswith('55'):
        return digits
    if len(digits) <= 11:
        return f"55{digits}"
    return digits


def _extract_message_text(message):
    if not isinstance(message, dict):
        return ''

    if message.get('conversation'):
        return message.get('conversation')
    if isinstance(message.get('extendedTextMessage'), dict):
        return message['extendedTextMessage'].get('text', '')
    if isinstance(message.get('buttonsResponseMessage'), dict):
        return message['buttonsResponseMessage'].get('selectedDisplayText', '')
    if isinstance(message.get('listResponseMessage'), dict):
        return message['listResponseMessage'].get('title', '')
    if isinstance(message.get('templateButtonReplyMessage'), dict):
        return message['templateButtonReplyMessage'].get('selectedDisplayText', '')
    return ''


def _extract_media_info(message):
    if not isinstance(message, dict):
        return None
    for key in MEDIA_MESSAGE_KEYS:
        if key in message and isinstance(message[key], dict):
            media = message[key]
            return {
                'media_type': key,
                'mime_type': media.get('mimetype', ''),
                'caption': media.get('caption', '')
            }
    return None


def _parse_timestamp(value):
    if value is None:
        return None
    try:
        ts = int(value)
        if ts > 10**12:
            ts = int(ts / 1000)
        return timezone.datetime.fromtimestamp(ts, tz=timezone.utc)
    except Exception:
        return None


def _status_from_payload(value):
    if not value:
        return ''
    normalized = str(value).upper()
    mapping = {
        'SENT': 'sent',
        'DELIVERED': 'delivered',
        'READ': 'read',
        'FAILED': 'failed',
        'ERROR': 'failed',
    }
    return mapping.get(normalized, '')


def get_or_create_conversa(instance_name, wa_id, nome='', telefone=''):
    contato, _ = WhatsappContato.objects.get_or_create(
        instance_name=instance_name,
        wa_id=wa_id,
        defaults={
            'nome': nome or '',
            'telefone': telefone or _extract_phone(wa_id),
        }
    )
    if nome and contato.nome != nome:
        contato.nome = nome
        contato.save(update_fields=['nome'])
    if telefone:
        telefone_norm = normalize_phone(telefone)
        if telefone_norm and contato.telefone != telefone_norm:
            contato.telefone = telefone_norm
            contato.save(update_fields=['telefone'])

    conversa, _ = WhatsappConversa.objects.get_or_create(
        instance_name=instance_name,
        contato=contato
    )
    return conversa


def process_webhook_event(payload, instance_name):
    raw_event = _get_event_type(payload)
    event_type = raw_event.upper().replace('.', '_') if raw_event else ''
    if event_type == 'MESSAGES_UPDATE':
        return _process_message_updates(payload, instance_name)
    if event_type in ['CONTACTS_UPSERT', 'CONTACTS_SET']:
        return _process_contacts_upsert(payload, instance_name)
    if event_type in ['CHATS_UPSERT', 'CHATS_SET']:
        return _process_chats_upsert(payload, instance_name)

    messages = _extract_messages(payload)
    if not messages:
        return 0

    owner_number = normalize_phone(getattr(settings, 'EVOLUTION_OWNER_NUMBER', ''))
    created_count = 0
    root_sender = payload.get('sender') if isinstance(payload, dict) else None
    root_data = payload.get('data') if isinstance(payload, dict) else None
    for item in messages:
        if not isinstance(item, dict):
            continue

        key = item.get('key', {}) if isinstance(item.get('key'), dict) else {}
        from_me = bool(key.get('fromMe') or item.get('fromMe'))
        remote_jid = _normalize_wa_id(key.get('remoteJid') or item.get('remoteJid') or item.get('from'))
        sender_override = item.get('sender') or root_sender
        if not sender_override and isinstance(root_data, dict):
            sender_override = root_data.get('sender')
        telefone_override = ''
        if remote_jid.endswith('@lid'):
            lid_number = remote_jid.split('@')[0]
            telefone_override = _pick_phone_override(
                [
                    sender_override,
                    key.get('participant'),
                    item.get('participant'),
                    item.get('participantJid'),
                    item.get('participantId'),
                    item.get('author'),
                ],
                lid_number,
                owner_number if not from_me else ''
            )
        if not remote_jid:
            continue

        direction = 'out' if from_me else 'in'
        message_id = key.get('id') or item.get('id') or ''

        message_payload = item.get('message') if isinstance(item.get('message'), dict) else {}
        push_name = item.get('pushName') or item.get('name') or ''

        text = _extract_message_text(message_payload)
        media_info = _extract_media_info(message_payload)

        message_type = 'text'
        if media_info:
            message_type = 'media'
            text = 'Midia recebida. Abra no celular para visualizar.'

        sent_at = _parse_timestamp(item.get('messageTimestamp') or item.get('timestamp')) or timezone.now()

        with transaction.atomic():
            conversa = get_or_create_conversa(instance_name, remote_jid, push_name, telefone_override)

            exists = WhatsappMensagem.objects.filter(conversa=conversa, message_id=message_id).exists() if message_id else False
            if exists:
                continue

            WhatsappMensagem.objects.create(
                conversa=conversa,
                message_id=message_id or '',
                direction=direction,
                status='sent',
                message_type=message_type,
                text=text or '',
                media_type=media_info['media_type'] if media_info else '',
                mime_type=media_info['mime_type'] if media_info else '',
                media_caption=media_info['caption'] if media_info else '',
                sent_at=sent_at,
            )

            conversa.last_message_text = text or ''
            conversa.last_message_at = sent_at
            conversa.last_message_direction = direction
            if direction == 'in':
                conversa.unread_count = conversa.unread_count + 1
            conversa.save(update_fields=['last_message_text', 'last_message_at', 'last_message_direction', 'unread_count', 'atualizado_em'])

            created_count += 1

    return created_count


def _upsert_contact(instance_name, jid, nome, numero):
    telefone = normalize_phone(numero)
    wa_id = ''
    if jid and jid.endswith('@s.whatsapp.net'):
        wa_id = jid
        telefone = normalize_phone(jid.split('@')[0])
    elif telefone:
        wa_id = f"{telefone}@s.whatsapp.net"
    else:
        return 0

    contato = None
    if telefone:
        contato = WhatsappContato.objects.filter(
            instance_name=instance_name,
            telefone=telefone
        ).first()
        if contato and contato.wa_id.endswith('@lid') and contato.wa_id != wa_id:
            contato.wa_id = wa_id
            contato.save(update_fields=['wa_id'])

    contato, _ = WhatsappContato.objects.get_or_create(
        instance_name=instance_name,
        wa_id=wa_id,
        defaults={
            'nome': nome or '',
            'telefone': telefone or '',
        }
    )

    updated_fields = []
    if nome and contato.nome != nome:
        contato.nome = nome
        updated_fields.append('nome')
    if telefone and contato.telefone != telefone:
        contato.telefone = telefone
        updated_fields.append('telefone')

    if updated_fields:
        contato.save(update_fields=updated_fields)

    return 1


def _process_contacts_upsert(payload, instance_name):
    items = _extract_event_items(payload)
    if not items:
        return 0
    updated = 0
    for item in items:
        jid = _extract_contact_jid(item)
        nome = _extract_contact_name(item)
        numero = _extract_contact_number(item, jid)
        updated += _upsert_contact(instance_name, jid, nome, numero)
    return updated


def _process_chats_upsert(payload, instance_name):
    items = _extract_event_items(payload)
    if not items:
        return 0
    updated = 0
    for item in items:
        jid = _extract_contact_jid(item)
        nome = _extract_contact_name(item)
        numero = _extract_contact_number(item, jid)
        updated += _upsert_contact(instance_name, jid, nome, numero)
    return updated


def _process_message_updates(payload, instance_name):
    updates = _extract_updates(payload)
    if not updates:
        return 0

    updated = 0
    for item in updates:
        if not isinstance(item, dict):
            continue
        key = item.get('key', {}) if isinstance(item.get('key'), dict) else {}
        message_id = key.get('id') or item.get('id')
        status_raw = ''
        if isinstance(item.get('update'), dict):
            status_raw = item['update'].get('status')
        if not status_raw:
            status_raw = item.get('status')
        status_value = _status_from_payload(status_raw)
        if not message_id or not status_value:
            continue

        updated += WhatsappMensagem.objects.filter(
            message_id=message_id,
            conversa__instance_name=instance_name
        ).update(status=status_value)

    return updated


def can_send_message(conversa):
    last_inbound = conversa.mensagens.filter(direction='in').order_by('-sent_at', '-created_at').first()
    if not last_inbound:
        return False
    last_time = last_inbound.sent_at or last_inbound.created_at
    return timezone.now() - last_time <= timedelta(hours=24)


def send_text_message(conversa, texto):
    url = f"{settings.EVOLUTION_API_URL}/message/sendText/{conversa.instance_name}"
    headers = {
        'apikey': settings.EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
    }
    numero = normalize_phone(conversa.contato.telefone or conversa.contato.wa_id.split('@')[0])
    payload = {
        'number': numero,
        'textMessage': {'text': texto},
        'options': {'delay': 800, 'linkPreview': False}
    }

    response = requests.post(url, json=payload, headers=headers, timeout=15)
    return response
