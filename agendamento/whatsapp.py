import requests
import logging
import re
import sys
from django.conf import settings
from configuracoes.models import DadosClinica, ConfiguracaoSistema

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
        print(f"⚠️ Erro ao ler especialidade: {e}")
        return "Especialista"

def enviar_mensagem_agendamento(agendamento):
    print("\n" + "="*40)
    print(f"🚀 [DIAGNÓSTICO] Iniciando envio ID: {agendamento.id}")
    
    try:
        # --- DIAGNÓSTICO DAS TRAVAS ---
        config = ConfiguracaoSistema.load()
        
        print(f"🧐 VALOR NO BANCO (GLOBAL): {config.enviar_whatsapp_global}")
        print(f"🧐 VALOR NO AGENDAMENTO (INDIVIDUAL): {agendamento.enviar_whatsapp}")

        # Validação 1
        if not config.enviar_whatsapp_global:
            print("🛑 BLOQUEADO: Configuração Global está como False (Desativado).")
            print("="*40 + "\n")
            return

        # Validação 2
        if not agendamento.enviar_whatsapp:
            print("🛑 BLOQUEADO: Checkbox Individual estava desmarcado.")
            print("="*40 + "\n")
            return
        
        print("✅ TRAVAS APROVADAS: Prosseguindo para montagem da mensagem...")

        # --- PREPARAÇÃO DOS DADOS ---
        paciente = agendamento.paciente
        profissional = agendamento.profissional
        dados_clinica = get_dados_clinica()
        
        telefone = formatar_telefone(paciente.telefone)
        print(f"📞 Telefone Formatado: {telefone}")

        if not telefone:
            print("❌ ERRO: Telefone inválido.")
            return

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
            f"Por favor, chegue com 15 minutos de antecedência. Em caso de dúvidas, entre em contato conosco!"
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

        print(f"📤 Enviando Request para API...")
        response = requests.post(url, json=payload, headers=headers, timeout=15)
        
        print(f"📡 Status API: {response.status_code}")
        
        if response.status_code in [200, 201]:
            print("✅ SUCESSO! Mensagem entregue.")
        else:
            print(f"⚠️ FALHA API: {response.text}")

    except Exception as e:
        print(f"🔥 ERRO CRÍTICO NO CÓDIGO: {e}")
        import traceback
        traceback.print_exc()
    
    print("="*40 + "\n")