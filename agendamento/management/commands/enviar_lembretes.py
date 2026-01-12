from django.core.management.base import BaseCommand
from datetime import timedelta, date
import logging

# Use imports locais dentro do handle se o erro persistir
class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        # Importações dentro do método evitam erros de carregamento do Django
        from agendamento.models import Agendamento
        from agendamento.whatsapp import enviar_lembrete_24h
        from configuracoes.models import ConfiguracaoSistema

        self.stdout.write("⏳ Iniciando rotina de lembretes...")
        
        try:
            config = ConfiguracaoSistema.load()
            amanha = date.today() + timedelta(days=1)
            
            # Busca agendamentos
            pendentes = Agendamento.objects.filter(
                data=amanha,
                status='agendado',
                lembrete_enviado=False
            )

            total = pendentes.count()
            self.stdout.write(f"Agendamentos para amanhã ({amanha}): {total}")

            enviados = 0
            for ag in pendentes:
                self.stdout.write(f"Processando paciente: {ag.paciente.nome}...")
                
                # Chamada da função
                resultado = enviar_lembrete_24h(ag)
                
                if resultado is True:
                    ag.lembrete_enviado = True
                    ag.save()
                    enviados += 1
                    self.stdout.write(self.style.SUCCESS(f"  - OK!"))
                else:
                    self.stdout.write(self.style.WARNING(f"  - Falhou ou ignorado."))

            # Atualiza data de execução
            config.data_ultima_execucao_lembrete = date.today()
            config.save()
            
            self.stdout.write(self.style.SUCCESS(f"✅ Fim: {enviados}/{total} enviados."))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ ERRO NO SCRIPT: {str(e)}"))
            # Isso vai imprimir o erro exato no log do Railway
            import traceback
            traceback.print_exc()
            raise e