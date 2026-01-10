from rest_framework import serializers
from .models import Agendamento, BloqueioAgenda
from configuracoes.models import DadosClinica
from profissionais.models import ProfissionalEspecialidade


class BloqueioAgendaSerializer(serializers.ModelSerializer):
    nome_profissional = serializers.CharField(source='profissional.nome', read_only=True, default="Todos os Profissionais")
    
    class Meta:
        model = BloqueioAgenda
        fields = '__all__'

class AgendamentoSerializer(serializers.ModelSerializer):
    # Campos de leitura simples
    nome_paciente = serializers.CharField(source='paciente.nome', read_only=True)
    telefone_paciente = serializers.CharField(source='paciente.telefone', read_only=True)
    nome_profissional = serializers.CharField(source='profissional.nome', read_only=True)
    nome_especialidade = serializers.CharField(source='especialidade.nome', read_only=True)
    
    # Campos Calculados
    nome_convenio = serializers.SerializerMethodField()
    fatura_pago = serializers.SerializerMethodField()
    
    # --- NOVO CAMPO: FORMA DE PAGAMENTO SALVA ---
    fatura_forma_pagamento = serializers.SerializerMethodField()

    detalhes_pdf = serializers.SerializerMethodField()
    

    class Meta:
        model = Agendamento
        fields = '__all__'

    def validate(self, data):
        # Se for encaixe ou edição de status (não criação), pula validação
        if data.get('is_encaixe') or self.instance:
            return data

        profissional = data['profissional']
        especialidade = data['especialidade']
        dia_agenda = data['data']
        horario = data['horario']
        
        # 1. Busca a REGRA de agenda válida para esse dia/hora
        # Precisamos encontrar a AgendaConfig que gerou esse horário
        dia_semana_num = dia_agenda.weekday() # 0=Segunda... 6=Domingo (Python)
        # Ajuste: No seu Model AgendaConfig 0=Domingo? Verifique. 
        # Normalmente Python weekday: 0=Seg, 6=Dom. 
        # Se no seu sistema 0=Domingo, use: (dia_agenda.isoweekday() % 7)
        
        # Vamos assumir o padrão do seu sistema (verifique se 0 é Dom ou Seg na page CriarAgenda)
        # Vou usar um filtro genérico que pega a regra vigente
        
        # Converte para o padrão do seu banco (ajuste se necessário)
        # Supondo que no banco 0=Domingo, 1=Segunda...
        dia_semana_banco = (dia_agenda.weekday() + 1) % 7 

        regras = AgendaConfig.objects.filter(
            profissional=profissional,
            especialidade=especialidade,
            data_inicio__lte=dia_agenda,
            data_fim__gte=dia_agenda,
            dia_semana=dia_semana_banco
        )

        limite_vagas = 1 # Padrão seguro

        for regra in regras:
            # Verifica se o horário bate com a regra
            if regra.tipo == 'fixo':
                if regra.hora_inicio == horario:
                    limite_vagas = regra.quantidade_atendimentos
                    break
            else:
                # Regras de intervalo (Padrão ou Periodo)
                # Verifica se o horário está dentro do range da regra
                if regra.hora_inicio <= horario < regra.hora_fim:
                    if regra.tipo == 'periodo':
                        limite_vagas = regra.quantidade_atendimentos
                    else:
                        # Tipo 'padrao' (por tempo) geralmente é 1 por vez
                        limite_vagas = 1 
                    break
        
        # 2. Conta quantos já existem nesse horário (excluindo cancelados/faltas)
        agendados = Agendamento.objects.filter(
            profissional=profissional,
            data=dia_agenda,
            horario=horario,
            status__in=['agendado', 'aguardando', 'em_atendimento', 'finalizado']
        ).count()

        if agendados >= limite_vagas:
            raise serializers.ValidationError(
                f"Limite de vagas excedido para este horário! (Máximo: {limite_vagas}, Agendados: {agendados}). Use a opção 'Encaixe' se necessário."
            )

        return data    

    def get_nome_convenio(self, obj):
        return obj.convenio.nome if obj.convenio else "Particular"

    def get_fatura_pago(self, obj):
        try: return obj.fatura.pago
        except: return False

    # --- LÓGICA DO NOVO CAMPO ---
    def get_fatura_forma_pagamento(self, obj):
        try:
            return obj.fatura.forma_pagamento
        except:
            return None # Retorna None se não tiver fatura ainda

    def get_detalhes_pdf(self, obj):
        # ... (seu código existente do PDF continua igual aqui) ...
        clinica = DadosClinica.load()
        logo_url = ""
        if clinica.logo:
            request = self.context.get('request')
            if request: logo_url = request.build_absolute_uri(clinica.logo.url)
            else: logo_url = clinica.logo.url
        
        registro = ""
        try:
            vinculo = ProfissionalEspecialidade.objects.get(
                profissional=obj.profissional, 
                especialidade=obj.especialidade
            )
            registro = f"{vinculo.sigla_conselho}: {vinculo.registro_conselho}/{vinculo.uf_conselho}"
        except: registro = "Não informado"

        return {
            "clinica_logo": logo_url,
            "paciente_cpf": obj.paciente.cpf,
            "paciente_nascimento": obj.paciente.data_nascimento,
            "paciente_sexo": obj.paciente.sexo,
            "paciente_mae": obj.paciente.nome_mae,
            "paciente_endereco": f"{obj.paciente.logradouro}, {obj.paciente.numero} - {obj.paciente.bairro}",
            "paciente_cidade": f"{obj.paciente.cidade}/{obj.paciente.estado}",
            "profissional_registro": registro,
            "clinica_nome": clinica.nome_fantasia,
            "clinica_endereco": f"{clinica.logradouro}, {clinica.numero}",
            "clinica_bairro": f"{clinica.bairro} - {clinica.cidade}",
            "clinica_telefone": clinica.telefone
        }