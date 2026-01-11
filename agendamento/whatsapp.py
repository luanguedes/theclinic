import requests
import logging
import re
from django.conf import settings
# CORREÇÃO AQUI 👇 (Era 'cadastro', mudamos para 'configuracoes')
from configuracoes.models import DadosClinica 

logger = logging.getLogger(__name__)

def formatar_telefone(telefone):
    if not telefone: return None
    nums = re.sub(r'\D', '', str(telefone))
    if len(nums) < 10: return None
    if not nums.startswith('55') and len(nums) <= 11:
        nums = '55' + nums
    return nums

def get_dados_clinica():
    try:
        # Busca o primeiro registro em configuracoes
        clinica = DadosClinica.objects.first()
        
        if not clinica:
            return {
                "nome": "The Clinic",
                "endereco": "Endereço não cadastrado"
            }
        
        # Verifica se os campos existem no seu model (ajuste se for diferente)
        # Geralmente é logradouro, numero, bairro...
        endereco_completo = f"{clinica.logradouro}, {clinica.numero}"
        
        if hasattr(clinica, 'bairro') and clinica.bairro:
            endereco_completo += f" - {clinica.bairro}"
            
        return {
            "nome": clinica.nome_fantasia or "A Clínica",
            "endereco": endereco_completo
        }
    except Exception as e:
        logger.error(f"Erro ao buscar dados da clínica: {e}")
        return {"nome": "Clínica", "endereco": ""}

def enviar_mensagem_agendamento(agendamento):
    try:
        paciente = agendamento.paciente
        profissional = agendamento.profissional
        
        dados_clinica = get_dados_clinica()
        
        telefone = formatar_telefone(paciente.telefone)
        if not telefone:
            logger.warning(f"Paciente {paciente.nome} sem telefone válido.")
            return

        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        hora_fmt = agendamento.horario.strftime('%H:%M')

        mensagem = (
            f"Olá, *{paciente.nome}*! 👋\n\n"
            f"Sua consulta na *{dados_clinica['nome']}* está confirmada!\n\n"
            f"📅 Data: *{data_fmt}*\n"
            f"⏰ Horário: *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {profissional.nome}\n\n"
            f"📍 Endereço: {dados_clinica['endereco']}\n\n"
            f"Por favor, responda SIM para confirmar."
        )

        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        
        payload = {
            "number": telefone,
            "text": mensagem,
            "delay": 1200,
            "linkPreview": False
        }
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }

        requests.post(url, json=payload, headers=headers, timeout=5)
        logger.info(f"WhatsApp enviado para {paciente.nome}")

    except Exception as e:
        logger.error(f"Erro ao enviar WhatsApp: {e}")