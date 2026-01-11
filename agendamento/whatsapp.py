import requests
import logging
import re
import sys
from django.conf import settings
from configuracoes.models import DadosClinica

# Configura logs para aparecerem no terminal do Railway
logging.basicConfig(stream=sys.stdout, level=logging.INFO)
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
            return {"nome": "The Clinic", "endereco": "Endereço não cadastrado"}
        
        endereco_completo = f"{clinica.logradouro}, {clinica.numero}"
        if clinica.bairro: endereco_completo += f" - {clinica.bairro}"
        if clinica.complemento: endereco_completo += f" ({clinica.complemento})"
            
        return {
            "nome": clinica.nome_fantasia or "A Clínica",
            "endereco": endereco_completo
        }
    except Exception as e:
        print(f"❌ ERRO ao buscar clínica: {e}")
        return {"nome": "Clínica", "endereco": ""}

def get_dia_semana(data_obj):
    dias = {0: "Segunda", 1: "Terça", 2: "Quarta", 3: "Quinta", 4: "Sexta", 5: "Sábado", 6: "Domingo"}
    return dias.get(data_obj.weekday(), "")

def enviar_mensagem_agendamento(agendamento):
    print(f"🚀 [WHATSAPP REAL] Iniciando envio para Agendamento ID: {agendamento.id}")
    
    try:
        paciente = agendamento.paciente
        profissional = agendamento.profissional
        dados_clinica = get_dados_clinica()
        
        telefone = formatar_telefone(paciente.telefone)
        if not telefone:
            print("❌ Telefone do paciente inválido ou vazio.")
            return

        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        dia_semana = get_dia_semana(agendamento.data)
        hora_fmt = agendamento.horario.strftime('%H:%M')
        
        # Tratamento seguro para especialidade
        try:
            nome_especialidade = getattr(profissional.especialidade, 'nome', str(profissional.especialidade))
        except:
            nome_especialidade = "Especialista"

        mensagem = (
            f"Olá, *{paciente.nome}*! 👋\n\n"
            f"Sua consulta na *{dados_clinica['nome']}* está confirmada!\n\n"
            f"📅 Data: *{data_fmt} ({dia_semana})*\n"
            f"⏰ Horário: *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {profissional.nome} - _{nome_especialidade}_\n\n"
            f"📍 Endereço: {dados_clinica['endereco']}\n\n"
        )

        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        
        # --- AQUI ESTÁ O SEGREDO (Igual ao Teste) ---
        payload = {
            "number": telefone,
            "textMessage": {
                "text": mensagem
            },
            "options": {
                "delay": 1200,
                "linkPreview": False
            }
        }
        # --------------------------------------------
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }

        print(f"📤 Enviando POST para o número {telefone}...")
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        print(f"📡 Status Code: {response.status_code}")
        print(f"📩 Resposta: {response.text}") # Mostra o erro se houver

    except Exception as e:
        print(f"🔥 ERRO CRÍTICO NO ENVIO: {e}")