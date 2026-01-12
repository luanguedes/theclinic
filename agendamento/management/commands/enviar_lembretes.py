from django.core.management.base import BaseCommand
from datetime import datetime, timedelta, date

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        from configuracoes.models import ConfiguracaoSistema
        from agendamento.models import Agendamento
        from agendamento.whatsapp import enviar_lembrete_24h

        config = ConfiguracaoSistema.load()
        hoje = date.today()
        
        # 1. PEGAR HORÁRIOS
        agendado_str = config.horario_disparo_lembrete  # Ex: "10:30"
        agora_dt = datetime.now()
        
        # Converte o horário do banco para comparação numérica
        hora_ag, min_ag = map(int, agendado_str.split(':'))
        
        # 2. VERIFICAÇÃO DE SEGURANÇA (A JANELA)
        # Se ainda não chegou a hora ou o minuto, encerra.
        if agora_dt.hour < hora_ag or (agora_dt.hour == hora_ag and agora_dt.minute < min_ag):
            self.stdout.write(f"Aguardando... Horário agendado: {agendado_str}")
            return

        # 3. VERIFICAÇÃO DE DUPLICIDADE (O BLOQUEIO)
        # Se já passou do horário, mas o campo 'data_ultima_execucao' já é HOJE,
        # significa que o trabalho do dia já foi feito.
        if config.data_ultima_execucao_lembrete == hoje:
            self.stdout.write("Trabalho de hoje já concluído. Voltarei amanhã!")
            return

        # 4. DISPARO
        self.stdout.write(f"🚀 Iniciando disparos! (Agendado: {agendado_str} | Agora: {agora_dt.strftime('%H:%M')})")
        
        amanha = hoje + timedelta(days=1)
        pendentes = Agendamento.objects.filter(
            data=amanha,
            status='agendado',
            lembrete_enviado=False
        )

        enviados = 0
        for ag in pendentes:
            if enviar_lembrete_24h(ag):
                ag.lembrete_enviado = True
                ag.save()
                enviados += 1
        
        # CRÍTICO: Marca que hoje está pago!
        config.data_ultima_execucao_lembrete = hoje
        config.save()

        self.stdout.write(self.style.SUCCESS(f"✅ Sucesso: {enviados} lembretes enviados."))