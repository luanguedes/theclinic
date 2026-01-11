import requests
import logging
import re
import sys
from django.conf import settings
from configuracoes.models import DadosClinica

# Força o log a sair no terminal do Railway
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
        print("🔍 Buscando dados da clínica...")
        clinica = DadosClinica.objects.first()
        
        if not clinica:
            print("⚠️ Nenhuma clínica cadastrada. Usando padrão.")
            return {
                "nome": "The Clinic",
                "endereco": "Endereço não cadastrado"
            }
        
        endereco_completo = f"{clinica.logradouro}, {clinica.numero}"
        if clinica.bairro:
            endereco_completo += f" - {clinica.bairro}"
        if clinica.complemento:
            endereco_completo += f" ({clinica.complemento})"
            
        print(f"✅ Clínica encontrada: {clinica.nome_fantasia}")
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
    """
    Função principal de envio com prints de depuração
    """
    print("="*30)
    print(f"🚀 INICIANDO THREAD DE ENVIO: Agendamento ID {agendamento.id}")
    
    try:
        # 1. Dados Básicos
        paciente = agendamento.paciente
        profissional = agendamento.profissional
        print(f"👤 Paciente: {paciente.nome} | Médico: {profissional.nome}")

        # 2. Dados da Clínica
        dados_clinica = get_dados_clinica()

        # 3. Telefone
        print(f"📱 Telefone original: {paciente.telefone}")
        telefone = formatar_telefone(paciente.telefone)
        print(f"📞 Telefone formatado: {telefone}")
        
        if not telefone:
            print("❌ ABORTANDO: Telefone inválido ou inexistente.")
            return

        # 4. Formatação
        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        dia_semana = get_dia_semana(agendamento.data)
        hora_fmt = agendamento.horario.strftime('%H:%M')
        
        nome_especialidade = getattr(profissional.especialidade, 'nome', str(profissional.especialidade)) if profissional.especialidade else "Especialista"

        mensagem = (
            f"Olá, *{paciente.nome}*! 👋\n\n"
            f"Sua consulta na *{dados_clinica['nome']}* está confirmada!\n\n"
            f"📅 Data: *{data_fmt} ({dia_semana})*\n"
            f"⏰ Horário: *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {profissional.nome} - _{nome_especialidade}_\n\n"
            f"📍 Endereço: {dados_clinica['endereco']}\n\n"
            f"Por favor, responda SIM para confirmar."
        )

        # 5. Payload
        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        
        payload = {
            "number": telefone,
            "textMessage": mensagem, # <--- Atenção aqui: textMessage
            "options": {
                "delay": 1200,
                "linkPreview": False
            }
        }
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }

        print(f"📤 Enviando POST para: {url}")
        # print(f"📦 Payload: {payload}") # Descomente se quiser ver o texto inteiro

        # 6. Disparo Real
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        print(f"📡 Status Code: {response.status_code}")
        print(f"📩 Resposta da API: {response.text}")

        if response.status_code in [200, 201]:
            print("✅ SUCESSO! Mensagem entregue para a API.")
        else:
            print("⚠️ FALHA NA API: Verifique a chave, a instância ou o payload.")

    except Exception as e:
        # Aqui capturamos qualquer erro que estava silenciado
        print(f"🔥 ERRO CRÍTICO NA THREAD (EXCEPTION): {e}")
        import traceback
        traceback.print_exc()
    
    print("="*30)