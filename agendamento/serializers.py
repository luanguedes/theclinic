from rest_framework import serializers
from .models import Agendamento
from configuracoes.models import DadosClinica
from profissionais.models import ProfissionalEspecialidade

class AgendamentoSerializer(serializers.ModelSerializer):
    # Campos de leitura simples
    nome_paciente = serializers.CharField(source='paciente.nome', read_only=True)
    telefone_paciente = serializers.CharField(source='paciente.telefone', read_only=True)
    nome_profissional = serializers.CharField(source='profissional.nome', read_only=True)
    nome_especialidade = serializers.CharField(source='especialidade.nome', read_only=True)
    nome_convenio = serializers.SerializerMethodField()
    fatura_pago = serializers.SerializerMethodField()

    def get_fatura_pago(self, obj):
        # Tenta acessar a fatura relacionada
        try:
            return obj.fatura.pago
        except:
            return False
    
    # --- DADOS COMPLETOS PARA O PDF ---
    detalhes_pdf = serializers.SerializerMethodField()

    class Meta:
        model = Agendamento
        fields = '__all__'

    def get_nome_convenio(self, obj):
        return obj.convenio.nome if obj.convenio else "Particular"

    def get_detalhes_pdf(self, obj):
        # 1. Dados da Clínica
        clinica = DadosClinica.load()
        
        logo_url = ""
        if clinica.logo:
            request = self.context.get('request')
            if request:
                logo_url = request.build_absolute_uri(clinica.logo.url)
            else:
                logo_url = clinica.logo.url
        
        # 2. Registro do Conselho (CRM/etc)
        registro = ""
        try:
            vinculo = ProfissionalEspecialidade.objects.get(
                profissional=obj.profissional, 
                especialidade=obj.especialidade
            )
            registro = f"{vinculo.sigla_conselho}: {vinculo.registro_conselho}/{vinculo.uf_conselho}"
        except:
            registro = "Não informado"

        return {
            # Paciente
            "clinica_logo": logo_url,
            "paciente_cpf": obj.paciente.cpf,
            "paciente_nascimento": obj.paciente.data_nascimento,
            "paciente_sexo": obj.paciente.sexo,
            "paciente_mae": obj.paciente.nome_mae,
            "paciente_endereco": f"{obj.paciente.logradouro}, {obj.paciente.numero} - {obj.paciente.bairro}",
            "paciente_cidade": f"{obj.paciente.cidade}/{obj.paciente.estado}",
            
            # Profissional
            "profissional_registro": registro,

            # Clínica
            "clinica_nome": clinica.nome_fantasia,
            "clinica_endereco": f"{clinica.logradouro}, {clinica.numero}",
            "clinica_bairro": f"{clinica.bairro} - {clinica.cidade}",
            "clinica_telefone": clinica.telefone
        }