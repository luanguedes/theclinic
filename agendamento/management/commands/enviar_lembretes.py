from django.core.management.base import BaseCommand
from datetime import timedelta, date
import logging

class Command(BaseCommand):
    help = 'Envia lembretes de consulta para amanhã, independentemente de execuções anteriores no dia.'

    def handle(self, *args, **kwargs):
        # Importações locais para evitar problemas de contexto
        from agendamento.models import Agendamento
        from agendamento.whatsapp import enviar_lembrete_24h
        from configuracoes.models import ConfiguracaoSistema

        self.stdout.write("⏳ Iniciando rotina de lembretes...")
        
        try:
            config = ConfiguracaoSistema.load()
            amanha = date.today() + timedelta(days=1)
            
            # Buscamos quem ainda não recebeu o lembrete para amanhã.
            # Se você já enviou manualmente, o lembrete_enviado será True e o registro não aparecerá aqui.
            pendentes = Agendamento.objects.filter(
                data=amanha,
                status='agendado',
                lembrete_enviado=False
            )

            total = pendentes.count()
            self.stdout.write(f"Agendamentos pendentes para amanhã ({amanha}): {total}")

            enviados = 0
            for ag in pendentes:
                self.stdout.write(f"Processando paciente: {ag.paciente.nome}...")
                
                # Chamada da função de envio
                resultado = enviar_lembrete_24h(ag)
                
                if resultado is True:
                    ag.lembrete_enviado = True
                    ag.save()
                    enviados += 1
                    self.stdout.write(self.style.SUCCESS(f"  - OK!"))
                else:
                    self.stdout.write(self.style.WARNING(f"  - Falhou ou ignorado."))

            # Atualizamos a data apenas para controle visual na tela de configurações,
            # mas o script não usa mais essa data para bloquear a execução.
            config.data_ultima_execucao_lembrete = date.today()
            config.save()
            
            self.stdout.write(self.style.SUCCESS(f"✅ Fim da rotina: {enviados}/{total} novos lembretes enviados."))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ ERRO NO SCRIPT: {str(e)}"))
            import traceback
            traceback.print_exc()
            raise e