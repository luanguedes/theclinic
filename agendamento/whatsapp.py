import requests
import logging
import re
import sys
from django.conf import settings
from configuracoes.models import DadosClinica, ConfiguracaoSistema 

# Configuração de Logger
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
logger = logging.getLogger('agendamento.whatsapp')

def formatar_telefone(telefone):
    """Limpa e formata o telefone para o padrão 55 + DDD + Numero"""
    if not telefone: return None
    nums = re.sub(r'\D', '', str(telefone))
    
    if len(nums) < 10: return None
    
    # Se não começar com 55 e tiver tamanho de celular BR (10 ou 11), adiciona
    if not nums.startswith('55') and len(nums) <= 11:
        nums = '55' + nums
        
    return nums

def get_dados_clinica():
    try:
        clinica = DadosClinica.objects.first()
        if not clinica:
            return {"nome": "The Clinic", "endereco": "Endereço não cadastrado"}
        
        endereco_completo = f"{clinica.logradouro}, {clinica.numero}"
        if clinica.bairro: endereco_completo += f" - {clinica.bairro}"
        if clinica.complemento: endereco_completo += f" ({clinica.complemento})"
            
        return {
            "nome": clinica.nome_fantasia or "A Clínica",
            "endereco": endereco_completo
        }
    except Exception as e:
        logger.error(f"Erro ao buscar clínica: {e}")
        return {"nome": "Clínica", "endereco": ""}

def get_dia_semana(data_obj):
    dias = {0: "Segunda-feira", 1: "Terça-feira", 2: "Quarta-feira", 3: "Quinta-feira", 4: "Sexta-feira", 5: "Sábado", 6: "Domingo"}
    return dias.get(data_obj.weekday(), "")

def get_nome_especialidade(agendamento, profissional):
    try:
        if hasattr(agendamento, 'especialidade') and agendamento.especialidade:
            return getattr(agendamento.especialidade, 'nome', str(agendamento.especialidade))

        if hasattr(profissional, 'especialidades_vinculo'):
            vinculos = profissional.especialidades_vinculo.all()
            if vinculos.exists():
                nomes = [v.especialidade.nome for v in vinculos if v.especialidade]
                return " / ".join(nomes)

        return "Especialista"
    except Exception as e:
        logger.warning(f"Erro ao ler especialidade: {e}")
        return "Especialista"

# --- HELPER DE DISPARO (CENTRALIZADO) ---
def _disparar_api(telefone, mensagem):
    """Função única para realizar o POST na Evolution API"""
    try:
        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        logger.info(f"📤 Disparo WhatsApp -> url={url} numero={telefone}")
        
        payload = {
            "number": telefone,
            "textMessage": {"text": mensagem},
            "options": {"delay": 1200, "linkPreview": False}
        }
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Timeout para evitar que o servidor trave esperando resposta
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        if response.status_code in [200, 201]:
            logger.info(f"✅ Mensagem enviada para {telefone}")
            return True
        else:
            logger.error(f"⚠️ Erro API Evolution ({response.status_code}): {response.text}")
            logger.error(f"↩︎ Response headers: {response.headers}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"🔥 Erro de conexão com API Whatsapp: {e}")
        return False
    except Exception as e:
        logger.error(f"🔥 Erro genérico no disparo: {e}")
        return False

# --- FUNÇÃO 1: CONFIRMAÇÃO DE AGENDAMENTO ---
def enviar_mensagem_agendamento(agendamento):
    try:
        config = ConfiguracaoSistema.load()
        if not config.enviar_whatsapp_global or not config.enviar_wpp_confirmacao:
            return

        if not agendamento.enviar_whatsapp:
            return
        
        paciente = agendamento.paciente
        profissional = agendamento.profissional
        dados_clinica = get_dados_clinica()
        telefone = formatar_telefone(paciente.telefone)
        
        if not telefone: return

        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        dia_semana = get_dia_semana(agendamento.data)
        hora_fmt = agendamento.horario.strftime('%H:%M')
        nome_especialidade = get_nome_especialidade(agendamento, profissional)

        mensagem = (
            f"Olá, *{paciente.nome}*! 👋\n\n"
            f"Sua consulta na *{dados_clinica['nome']}* está confirmada!\n\n"
            f"📅 Data: *{data_fmt}* - _{dia_semana}_\n"
            f"⏰ Horário: *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {profissional.nome}\n"
            f"🩺 Especialidade: *{nome_especialidade}*\n\n"
            f"📍 Endereço: {dados_clinica['endereco']}\n\n"
            f"Por favor, chegue com 15 minutos de antecedência."
        )

        return _disparar_api(telefone, mensagem)

    except Exception as e:
        logger.exception(f"Erro ao montar mensagem de agendamento: {e}")
        return False

# --- FUNÇÃO 2: CANCELAMENTO/BLOQUEIO ---
def enviar_mensagem_cancelamento_bloqueio(agendamento, motivo_personalizado=""):
    try:
        config = ConfiguracaoSistema.load()
        if not config.enviar_whatsapp_global or not config.enviar_wpp_bloqueio:
            return

        paciente = agendamento.paciente
        dados_clinica = get_dados_clinica()
        telefone = formatar_telefone(paciente.telefone)
        
        if not telefone: return

        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        hora_fmt = agendamento.horario.strftime('%H:%M')
        
        bloco_motivo = f"\nℹ️ *Motivo:* _{motivo_personalizado}_\n" if motivo_personalizado else ""

        mensagem = (
            f"Olá, *{paciente.nome}*.\n\n"
            f"Informamos que sua consulta na *{dados_clinica['nome']}* precisou ser *CANCELADA*.\n\n"
            f"📅 Data original: *{data_fmt}* às *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {agendamento.profissional.nome}\n\n"
            f"{bloco_motivo}\n"
            f"Por favor, entre em contato conosco para reagendar.\n"
            f"Pedimos desculpas pelo transtorno. 🙏"
        )

        return _disparar_api(telefone, mensagem)

    except Exception as e:
        logger.exception(f"Erro ao montar mensagem de cancelamento: {e}")
        return False

# --- FUNÇÃO 3: LEMBRETE (DIA SEGUINTE) ---
def enviar_lembrete_24h(agendamento):
    """
    Função chamada pelo botão manual ou cronjob para lembrar pacientes do dia seguinte.
    """
    try:
        config = ConfiguracaoSistema.load()
        
        # Travas de segurança
        if not config.enviar_whatsapp_global:
            logger.info("🚫 Lembrete cancelado: Sistema Global Desativado.")
            return False

        if not config.enviar_wpp_lembrete:
            logger.info("🚫 Lembrete cancelado: Módulo de Lembrete Desativado.")
            return False

        paciente = agendamento.paciente
        profissional = agendamento.profissional
        dados_clinica = get_dados_clinica()
        telefone = formatar_telefone(paciente.telefone)
        
        if not telefone: 
            logger.warning(f"⚠️ Paciente {paciente.nome} sem telefone válido para envio.")
            return False

        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        hora_fmt = agendamento.horario.strftime('%H:%M')
        nome_especialidade = get_nome_especialidade(agendamento, profissional)
        
        mensagem = (
            f"Olá, *{paciente.nome}*! 👋\n\n"
            f"Lembrete da sua consulta amanhã na *{dados_clinica['nome']}*\n\n"
            f"📅 *Amanhã, {data_fmt}*\n"
            f"⏰ Horário: *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {profissional.nome}\n"
            f"🩺 Especialidade: *{nome_especialidade}*\n\n"
            f"📍 Endereço: {dados_clinica['endereco']}\n\n"
            f"Sua presença é muito importante. Se não puder vir, avise-nos!"
        )

        # REUTILIZA O HELPER PARA EVITAR DUPLICIDADE DE CÓDIGO
        return _disparar_api(telefone, mensagem)

    except Exception as e:
        # Importante: Retorna False em vez de quebrar, para que o loop na View continue
        logger.exception(f"🔥 Erro crítico ao processar lembrete para {agendamento.id}: {e}")
        return False
