from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
from agendamento.models import Agendamento
from agendamento.whatsapp import enviar_lembrete_24h
from configuracoes.models import ConfiguracaoSistema # Importe o config

class Command(BaseCommand):
    help = 'Envia lembretes de consulta para agendamentos de amanhã'

    def handle(self, *args, **kwargs):
        self.stdout.write("⏳ Iniciando rotina de lembretes...")
        
        config = ConfiguracaoSistema.load()

        if not config.enviar_whatsapp_global:
             self.stdout.write(self.style.WARNING("🛑 Cancelado: Módulo WhatsApp Global DESATIVADO."))
             return
        
        # Verifica se o recurso está ativado globalmente
        if not config.enviar_wpp_lembrete:
             self.stdout.write(self.style.WARNING("⚠️ Rotina cancelada: O envio de lembretes está DESATIVADO nas configurações."))
             return

        amanha = date.today() + timedelta(days=1)
        
        # Busca pendentes (lembrete_enviado=False garante que não repete)
        agendamentos = Agendamento.objects.filter(
            data=amanha,
            status='agendado',
            lembrete_enviado=False
        )

        total = agendamentos.count()
        enviados = 0

        if total > 0:
            for ag in agendamentos:
                if enviar_lembrete_24h(ag):
                    ag.lembrete_enviado = True
                    ag.save()
                    enviados += 1
        
        # --- ATUALIZA A DATA DA ÚLTIMA EXECUÇÃO NO BANCO ---
        config.data_ultima_execucao_lembrete = date.today()
        config.save()
        # ---------------------------------------------------
        
        self.stdout.write(self.style.SUCCESS(f"✅ Processo finalizado! {enviados}/{total} novos lembretes enviados."))