from django.core.management.base import BaseCommand
from datetime import datetime, timedelta, date
import logging

class Command(BaseCommand):
    help = 'Envia lembretes se o horário atual coincidir com a configuração do sistema.'

    def handle(self, *args, **kwargs):
        from configuracoes.models import ConfiguracaoSistema
        from agendamento.models import Agendamento
        from agendamento.whatsapp import enviar_lembrete_24h

        config = ConfiguracaoSistema.load()
        
        # 1. PEGAR HORÁRIOS
        agendado = config.horario_disparo_lembrete # Ex: "08:00"
        agora = datetime.now().strftime("%H:%M") # Pega Hora:Minuto atual
        
        self.stdout.write(f"⏰ Verificação: Hora atual {agora} | Hora agendada {agendado}")

        # 2. COMPARAR (Modo Comparação)
        # Verificamos apenas a HORA para dar uma margem de segurança caso o cron atrase uns minutos
        hora_agendada = agendado.split(':')[0]
        hora_atual = agora.split(':')[0]

        if hora_atual != hora_agendada:
            self.stdout.write(self.style.WARNING(f"Ainda não é o horário de disparo ({agendado}). Encerrando."))
            return

        # 3. VERIFICAR SE JÁ RODOU HOJE (Evita disparos duplicados na mesma hora)
        if config.data_ultima_execucao_lembrete == date.today():
            self.stdout.write(self.style.SUCCESS("Os lembretes de hoje já foram processados nesta janela de hora."))
            return

        # --- SE PASSOU NAS VALIDAÇÕES, SEGUE A LÓGICA NORMAL ---
        self.stdout.write("🚀 Horário confirmado! Iniciando disparos...")
        
        amanha = date.today() + timedelta(days=1)
        pendentes = Agendamento.objects.filter(
            data=amanha,
            status='agendado',
            lembrete_enviado=False
        )

        total = pendentes.count()
        enviados = 0

        for ag in pendentes:
            if enviar_lembrete_24h(ag):
                ag.lembrete_enviado = True
                ag.save()
                enviados += 1
        
        # Marca que já rodou hoje com sucesso
        config.data_ultima_execucao_lembrete = date.today()
        config.save()

        self.stdout.write(self.style.SUCCESS(f"✅ Concluído: {enviados}/{total} enviados."))