import requests
import logging
import re
from django.conf import settings
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
        clinica = DadosClinica.objects.first()
        
        if not clinica:
            return {
                "nome": "The Clinic",
                "endereco": "Endereço não cadastrado"
            }
        
        # Monta o endereço completo com Complemento
        # Ex: Av. Vitória, 5800 - Zona V (Sala 02)
        endereco_completo = f"{clinica.logradouro}, {clinica.numero}"
        
        if clinica.bairro:
            endereco_completo += f" - {clinica.bairro}"
        
        # --- ADICIONADO: COMPLEMENTO ---
        if clinica.complemento:
            endereco_completo += f" ({clinica.complemento})"
            
        return {
            "nome": clinica.nome_fantasia or "A Clínica",
            "endereco": endereco_completo
        }
    except Exception as e:
        logger.error(f"Erro ao buscar dados da clínica: {e}")
        return {"nome": "Clínica", "endereco": ""}

def get_dia_semana(data_obj):
    dias = {
        0: "Segunda-feira",
        1: "Terça-feira",
        2: "Quarta-feira",
        3: "Quinta-feira",
        4: "Sexta-feira",
        5: "Sábado",
        6: "Domingo"
    }
    return dias.get(data_obj.weekday(), "")

def enviar_mensagem_agendamento(agendamento):
    try:
        paciente = agendamento.paciente
        profissional = agendamento.profissional
        
        dados_clinica = get_dados_clinica()
        
        telefone = formatar_telefone(paciente.telefone)
        if not telefone:
            logger.warning(f"Paciente {paciente.nome} sem telefone válido.")
            return

        # Formatações de Data e Hora
        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        dia_semana = get_dia_semana(agendamento.data) # Pega o dia da semana
        hora_fmt = agendamento.horario.strftime('%H:%M')

        # Tenta pegar o nome da especialidade (trata caso seja objeto ou string)
        nome_especialidade = "Especialista"
        if profissional.especialidade:
            # Se for um objeto (ForeignKey), pega o .nome, senão usa string direta
            nome_especialidade = getattr(profissional.especialidade, 'nome', str(profissional.especialidade))

        mensagem = (
            f"Olá, *{paciente.nome}*! 👋\n\n"
            f"Sua consulta na *{dados_clinica['nome']}* está confirmada!\n\n"
            f"📅 Data: *{data_fmt} ({dia_semana})*\n"
            f"⏰ Horário: *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {profissional.nome} - _{nome_especialidade}_\n\n"
            f"📍 Endereço: {dados_clinica['endereco']}\n\n"
        )

        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        
        payload = {
            "number": telefone,
            "textMessage": mensagem, # <--- CORREÇÃO: Mudado de 'text' para 'textMessage'
            "options": {
                "delay": 1200,
                "linkPreview": False
            }
        }
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }

        # Adicionei print para você ver o JSON final no log do Railway se der erro
        print(f"Enviando Payload WhatsApp: {payload}")

        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        if response.status_code in [200, 201]:
            logger.info(f"✅ WhatsApp enviado para {paciente.nome}")
        else:
            logger.error(f"❌ Erro Evolution API: {response.text}")

    except Exception as e:
        logger.error(f"❌ Erro Crítico ao enviar WhatsApp: {e}")