from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
import logging

# Importações dos modelos e funções
from agendamento.models import Agendamento
from agendamento.whatsapp import enviar_lembrete_24h
from configuracoes.models import ConfiguracaoSistema

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Envia lembretes de consulta para agendamentos de amanhã'

    def handle(self, *args, **kwargs):
        self.stdout.write("⏳ Iniciando rotina de lembretes...")
        
        try:
            config = ConfiguracaoSistema.load()
            
            # 1. Verifica se o recurso está ativado globalmente
            # Checamos o global E o específico de lembrete
            if not config.enviar_whatsapp_global or not config.enviar_wpp_lembrete:
                 self.stdout.write(self.style.WARNING("⚠️ Rotina cancelada: O envio de lembretes está desativado nas configurações."))
                 return

            # 2. Define a data alvo (Amanhã)
            amanha = date.today() + timedelta(days=1)
            
            # 3. Busca agendamentos pendentes
            # Filtra por: data de amanhã, status agendado e que não recebeu lembrete ainda
            agendamentos = Agendamento.objects.filter(
                data=amanha,
                status='agendado',
                lembrete_enviado=False
            )

            total = agendamentos.count()
            self.stdout.write(f"Encontrados {total} agendamentos para amanhã.")

            enviados = 0
            if total > 0:
                for ag in agendamentos:
                    try:
                        # Tenta enviar o WhatsApp
                        # Note que a função enviar_lembrete_24h deve retornar True ou False
                        if enviar_lembrete_24h(ag):
                            ag.lembrete_enviado = True
                            ag.save()
                            enviados += 1
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"Erro ao processar agendamento {ag.id}: {e}"))
            
            # 4. Atualiza a data da última execução nas configurações
            config.data_ultima_execucao_lembrete = date.today()
            config.save()
            
            self.stdout.write(self.style.SUCCESS(f"✅ Processo finalizado! {enviados}/{total} novos lembretes enviados."))

        except Exception as e:
            # Captura erros graves (ex: erro no banco ou importação)
            self.stdout.write(self.style.ERROR(f"🔥 Erro crítico no comando: {e}"))
            # Re-lança para o log do Django registrar o traceback completo
            raise e