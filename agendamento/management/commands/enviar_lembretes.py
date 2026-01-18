from django.core.management.base import BaseCommand
from datetime import datetime, timedelta, date, time
from django.utils import timezone

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        from configuracoes.models import ConfiguracaoSistema
        from agendamento.models import Agendamento
        from agendamento.whatsapp import enviar_lembrete_24h

        config = ConfiguracaoSistema.load()
        hoje = timezone.localdate()
        
        # 1. PEGAR HORÁRIOS
        agendado_raw = config.horario_disparo_lembrete  # Ex: "10:30" ou time
        agora_dt = timezone.localtime(timezone.now())

        if isinstance(agendado_raw, time):
            horario_agendado = agendado_raw
        else:
            agendado_str = str(agendado_raw)
            try:
                hora_ag, min_ag = map(int, agendado_str.split(':')[:2])
            except (ValueError, AttributeError):
                self.stdout.write("Horario de disparo invalido. Verifique a configuracao.")
                return
            horario_agendado = time(hour=hora_ag, minute=min_ag)

        # 2. VERIFICA????O DE SEGURAN??A (A JANELA)
        # Se ainda n??o chegou a hora ou o minuto, encerra.
        if agora_dt.time() < horario_agendado:
            self.stdout.write(f"Aguardando... Hor??rio agendado: {horario_agendado.strftime('%H:%M')}")
            return

        if not config.enviar_whatsapp_global or not config.enviar_wpp_lembrete:
            self.stdout.write("Disparo automatico desativado nas configuracoes.")
            return

        # 4. DISPARO
        self.stdout.write(f"Iniciando disparos! (Agendado: {horario_agendado.strftime('%H:%M')} | Agora: {agora_dt.strftime('%H:%M')})")
        
        amanha = hoje + timedelta(days=1)
        pendentes = Agendamento.objects.filter(
            data=amanha,
            status='agendado',
            lembrete_enviado=False
        )

        if config.data_ultima_execucao_lembrete == hoje and not pendentes.exists():
            self.stdout.write("Trabalho de hoje ja concluido e sem pendentes.")
            return

        enviados = 0
        for ag in pendentes:
            if enviar_lembrete_24h(ag):
                ag.lembrete_enviado = True
                ag.save()
                enviados += 1
        
        # CRÍTICO: Marca que hoje está pago!
        if enviados > 0:
            config.data_ultima_execucao_lembrete = hoje
            config.save()

        self.stdout.write(self.style.SUCCESS(f"✅ Sucesso: {enviados} lembretes enviados."))
