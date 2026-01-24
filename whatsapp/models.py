from django.db import models


class WhatsappContato(models.Model):
    instance_name = models.CharField(max_length=100, db_index=True)
    wa_id = models.CharField(max_length=150, db_index=True)
    nome = models.CharField(max_length=255, blank=True, default='')
    telefone = models.CharField(max_length=30, blank=True, default='')
    avatar_url = models.URLField(blank=True, default='')
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('instance_name', 'wa_id')
        ordering = ['nome', 'wa_id']

    def __str__(self):
        return f"{self.nome or self.wa_id}"


class WhatsappConversa(models.Model):
    instance_name = models.CharField(max_length=100, db_index=True)
    contato = models.ForeignKey(WhatsappContato, on_delete=models.CASCADE, related_name='conversas')
    last_message_text = models.TextField(blank=True, default='')
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_message_direction = models.CharField(max_length=10, blank=True, default='')
    unread_count = models.IntegerField(default=0)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('instance_name', 'contato')
        ordering = ['-last_message_at', '-atualizado_em']

    def __str__(self):
        return f"{self.contato}"


class WhatsappMensagem(models.Model):
    DIRECTION_CHOICES = [
        ('in', 'Recebida'),
        ('out', 'Enviada'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('sent', 'Enviada'),
        ('delivered', 'Entregue'),
        ('read', 'Lida'),
        ('failed', 'Falhou'),
    ]

    TYPE_CHOICES = [
        ('text', 'Texto'),
        ('media', 'Midia'),
        ('system', 'Sistema'),
    ]

    conversa = models.ForeignKey(WhatsappConversa, on_delete=models.CASCADE, related_name='mensagens')
    message_id = models.CharField(max_length=200, blank=True, default='', db_index=True)
    direction = models.CharField(max_length=10, choices=DIRECTION_CHOICES, default='in')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='sent')
    message_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='text')
    text = models.TextField(blank=True, default='')
    media_type = models.CharField(max_length=50, blank=True, default='')
    media_url = models.URLField(blank=True, default='')
    mime_type = models.CharField(max_length=100, blank=True, default='')
    media_caption = models.TextField(blank=True, default='')
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at', '-created_at']

    def __str__(self):
        return f"{self.conversa} ({self.direction})"
