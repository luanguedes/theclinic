import requests
import logging
import re
import sys
from django.conf import settings
from configuracoes.models import DadosClinica

# Logs no terminal do Railway
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
    dias = {0: "Segunda-feira", 1: "Terça-feira", 2: "Quarta-feira", 3: "Quinta-feira", 4: "Sexta-feira", 5: "Sábado", 6: "Domingo"}
    return dias.get(data_obj.weekday(), "")

def get_nome_especialidade(agendamento, profissional):
    """
    Busca o nome da especialidade respeitando seus Models.
    """
    try:
        # 1. Se o agendamento já tiver a especialidade definida, usa ela (Prioridade)
        if hasattr(agendamento, 'especialidade') and agendamento.especialidade:
            return getattr(agendamento.especialidade, 'nome', str(agendamento.especialidade))

        # 2. Se não, busca na lista de especialidades do Profissional
        # Usamos o 'related_name' definido no seu model: especialidades_vinculo
        if hasattr(profissional, 'especialidades_vinculo'):
            vinculos = profissional.especialidades_vinculo.all()
            
            if vinculos.exists():
                # Pega os nomes de todas as especialidades vinculadas
                # Ex: ["Cardiologia", "Clínica Médica"]
                nomes = [v.especialidade.nome for v in vinculos if v.especialidade]
                
                # Junta com uma barra: "Cardiologia / Clínica Médica"
                return " / ".join(nomes)

        return "Especialista"

    except Exception as e:
        print(f"⚠️ Erro ao ler especialidade: {e}")
        return "Especialista"

def enviar_mensagem_agendamento(agendamento):
    print(f"🚀 [WHATSAPP] Iniciando envio para Agendamento ID: {agendamento.id}")
    
    try:
        # --- VALIDAÇÃO 1: TRAVA GLOBAL ---
        config = ConfiguracaoSistema.load()
        if not config.enviar_whatsapp_global:
            print("🛑 ENVIO CANCELADO: O envio de WhatsApp está desativado globalmente nas configurações.")
            return

        # --- VALIDAÇÃO 2: TRAVA INDIVIDUAL ---
        if not agendamento.enviar_whatsapp:
            print("🛑 ENVIO CANCELADO: A recepcionista desmarcou o envio para este agendamento.")
            return
        paciente = agendamento.paciente
        profissional = agendamento.profissional
        dados_clinica = get_dados_clinica()
        
        telefone = formatar_telefone(paciente.telefone)
        if not telefone:
            print("❌ Telefone inválido.")
            return

        data_fmt = agendamento.data.strftime('%d/%m/%Y')
        dia_semana = get_dia_semana(agendamento.data)
        hora_fmt = agendamento.horario.strftime('%H:%M')
        
        # Agora passamos o agendamento E o profissional para buscar certo
        nome_especialidade = get_nome_especialidade(agendamento, profissional)

        mensagem = (
            f"Olá, *{paciente.nome}*! 👋\n\n"
            f"Sua consulta na *{dados_clinica['nome']}* está confirmada!\n\n"
            f"📅 Data: *{data_fmt}* - _{dia_semana}_\n"
            f"⏰ Horário: *{hora_fmt}*\n"
            f"👨‍⚕️ Profissional: {profissional.nome}\n"
            f"🩺 Especialidade: *{nome_especialidade}*\n\n"
            f"📍 Endereço: {dados_clinica['endereco']}\n\n"
            f"Por favor, chegue com 15 minutos de antecedência. Em caso de dúvidas, entre em contato conosco!\n\n"   
        )

        url = f"{settings.EVOLUTION_API_URL}/message/sendText/{settings.EVOLUTION_INSTANCE_NAME}"
        
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
        
        headers = {
            "apikey": settings.EVOLUTION_API_KEY,
            "Content-Type": "application/json"
        }

        print(f"📤 Enviando para {telefone}...")
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        if response.status_code in [200, 201]:
            print("✅ SUCESSO! Mensagem entregue.")
        else:
            print(f"⚠️ FALHA: {response.text}")

    except Exception as e:
        print(f"🔥 ERRO CRÍTICO: {e}")