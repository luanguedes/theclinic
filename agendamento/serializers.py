from rest_framework import serializers
from .models import Agendamento, BloqueioAgenda
from configuracoes.models import DadosClinica
from profissionais.models import ProfissionalEspecialidade
from agendas.models import AgendaConfig
from pacientes.models import Paciente  # Certifique-se que o import do model Paciente está correto

# --- SERIALIZER DE PACIENTE (Para uso geral ou aninhado) ---
class PacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Paciente
        fields = '__all__'

class BloqueioAgendaSerializer(serializers.ModelSerializer):
    # Usamos SerializerMethodField para evitar erro quando for Null
    nome_profissional = serializers.SerializerMethodField()
    
    class Meta:
        model = BloqueioAgenda
        fields = '__all__'

    def get_nome_profissional(self, obj):
        if obj.profissional:
            return obj.profissional.nome
        return "Todos os Profissionais"

class AgendamentoSerializer(serializers.ModelSerializer):
    # Campos de leitura simples
    nome_paciente = serializers.CharField(source='paciente.nome', read_only=True)
    telefone_paciente = serializers.CharField(source='paciente.telefone', read_only=True)
    nome_profissional = serializers.CharField(source='profissional.nome', read_only=True)
    nome_especialidade = serializers.CharField(source='especialidade.nome', read_only=True)
    
    # --- NOVOS CAMPOS PARA CORRIGIR A RECEPÇÃO ---
    # Busca a prioridade direto do cadastro do paciente em tempo real
    paciente_prioridade = serializers.CharField(source='paciente.prioridade', read_only=True)
    paciente_cpf = serializers.CharField(source='paciente.cpf', read_only=True)
    
    # Campos Calculados
    nome_convenio = serializers.SerializerMethodField()
    fatura_pago = serializers.SerializerMethodField()
    fatura_forma_pagamento = serializers.SerializerMethodField()
    detalhes_pdf = serializers.SerializerMethodField()
    triagem_realizada = serializers.SerializerMethodField()
    triagem_id = serializers.SerializerMethodField()
    triagem_realizada_em = serializers.SerializerMethodField()

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
        
        # 1. Busca a REGRA de agenda válida
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
            if regra.tipo == 'fixo':
                if regra.hora_inicio == horario:
                    limite_vagas = regra.quantidade_atendimentos
                    break
            else:
                if regra.hora_inicio <= horario < regra.hora_fim:
                    if regra.tipo == 'periodo':
                        limite_vagas = regra.quantidade_atendimentos
                    else:
                        limite_vagas = 1 
                    break
        
        # 2. Conta quantos já existem nesse horário
        agendados = Agendamento.objects.filter(
            profissional=profissional,
            data=dia_agenda,
            horario=horario,
            status__in=['agendado', 'aguardando', 'em_atendimento', 'finalizado']
        ).count()

        if agendados >= limite_vagas:
            raise serializers.ValidationError(
                f"Limite de vagas excedido! Máx: {limite_vagas}, Agendados: {agendados}"
            )

        return data     

    def get_nome_convenio(self, obj):
        return obj.convenio.nome if obj.convenio else "Particular"
    
    def get_fatura_pago(self, obj):
        try: return obj.fatura.pago
        except: return False

    def get_fatura_forma_pagamento(self, obj):
        try: return obj.fatura.forma_pagamento
        except: return None

    def get_detalhes_pdf(self, obj):
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
            
            # Adicionado aqui também para garantir consistência
            "paciente_prioridade": obj.paciente.prioridade,
            
            "paciente_endereco": f"{obj.paciente.logradouro}, {obj.paciente.numero} - {obj.paciente.bairro}",
            "paciente_cidade": f"{obj.paciente.cidade}/{obj.paciente.estado}",
            "profissional_registro": registro,
            "clinica_nome": clinica.nome_fantasia,
            "clinica_endereco": f"{clinica.logradouro}, {clinica.numero}",
            "clinica_bairro": f"{clinica.bairro} - {clinica.cidade}",
            "clinica_telefone": clinica.telefone
        }

    def _get_triagem(self, obj):
        return getattr(obj, 'triagem', None)

    def get_triagem_realizada(self, obj):
        return self._get_triagem(obj) is not None

    def get_triagem_id(self, obj):
        triagem = self._get_triagem(obj)
        return triagem.id if triagem else None

    def get_triagem_realizada_em(self, obj):
        triagem = self._get_triagem(obj)
        return triagem.criado_em if triagem else None
