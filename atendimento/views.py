from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.http import HttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from agendamento.models import Agendamento
from agendamento.serializers import AgendamentoSerializer
from .models import Triagem, AtendimentoMedico
from .serializers import TriagemSerializer, AtendimentoMedicoSerializer


class TriagemViewSet(viewsets.ModelViewSet):
    queryset = Triagem.objects.all().select_related('agendamento', 'agendamento__paciente')
    serializer_class = TriagemSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        agendamento_id = params.get('agendamento')
        if agendamento_id:
            qs = qs.filter(agendamento_id=agendamento_id)

        data = params.get('data')
        if data:
            qs = qs.filter(agendamento__data=data)

        profissional = params.get('profissional')
        if profissional:
            qs = qs.filter(agendamento__profissional_id=profissional)

        paciente = params.get('paciente')
        if paciente:
            qs = qs.filter(agendamento__paciente_id=paciente)

        return qs.order_by('-criado_em')

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        agendamento = serializer.validated_data['agendamento']
        defaults = dict(serializer.validated_data)
        defaults.pop('agendamento', None)
        defaults['realizado_por'] = request.user if request.user.is_authenticated else None

        triagem, created = Triagem.objects.update_or_create(
            agendamento=agendamento,
            defaults=defaults
        )

        out = self.get_serializer(triagem)
        return Response(out.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


def _has_atendimento_access(user):
    return bool(
        user
        and (
            getattr(user, 'is_superuser', False)
            or getattr(user, 'profissional_id', None)
        )
    )


class AtendimentoMedicoViewSet(viewsets.ModelViewSet):
    queryset = AtendimentoMedico.objects.all().select_related(
        'agendamento', 'paciente', 'profissional', 'cid_principal', 'cid_secundario'
    )
    serializer_class = AtendimentoMedicoSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not _has_atendimento_access(self.request.user):
            return AtendimentoMedico.objects.none()
        qs = super().get_queryset()
        params = self.request.query_params

        agendamento_id = params.get('agendamento')
        if agendamento_id:
            qs = qs.filter(agendamento_id=agendamento_id)

        paciente_id = params.get('paciente')
        if paciente_id:
            qs = qs.filter(paciente_id=paciente_id)

        profissional_id = params.get('profissional')
        if profissional_id:
            qs = qs.filter(profissional_id=profissional_id)
        elif self.request.user.profissional_id:
            qs = qs.filter(profissional_id=self.request.user.profissional_id)

        return qs.order_by('-criado_em')

    def perform_create(self, serializer):
        if not _has_atendimento_access(self.request.user):
            raise PermissionDenied('Acesso restrito.')
        serializer.save()

    def perform_update(self, serializer):
        if not _has_atendimento_access(self.request.user):
            raise PermissionDenied('Acesso restrito.')
        serializer.save()


class AtendimentoIniciarView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, paciente_id):
        if not _has_atendimento_access(request.user):
            return Response({'error': 'Acesso restrito.'}, status=status.HTTP_403_FORBIDDEN)

        agendamento = get_object_or_404(Agendamento, pk=paciente_id)
        if not request.user.is_superuser and request.user.profissional_id and agendamento.profissional_id != request.user.profissional_id:
            return Response({'error': 'Agendamento nao pertence ao profissional.'}, status=status.HTTP_403_FORBIDDEN)

        if agendamento.status == Agendamento.Status.AGUARDANDO:
            agendamento.status = Agendamento.Status.EM_ATENDIMENTO
            agendamento.inicio_atendimento = timezone.now().time()
            agendamento.save(update_fields=['status', 'inicio_atendimento', 'atualizado_em'])

        serializer = AgendamentoSerializer(agendamento, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class AtendimentoSalvarView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not _has_atendimento_access(request.user):
            return Response({'error': 'Acesso restrito.'}, status=status.HTTP_403_FORBIDDEN)

        agendamento_id = request.data.get('agendamento') or request.data.get('agendamento_id')
        if not agendamento_id:
            return Response({'error': 'Agendamento nao informado.'}, status=status.HTTP_400_BAD_REQUEST)

        agendamento = get_object_or_404(
            Agendamento.objects.select_related('paciente', 'profissional'),
            pk=agendamento_id
        )
        if not request.user.is_superuser and request.user.profissional_id and agendamento.profissional_id != request.user.profissional_id:
            return Response({'error': 'Agendamento nao pertence ao profissional.'}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data.copy()
        payload['agendamento'] = agendamento.id
        payload['paciente'] = agendamento.paciente_id
        if not payload.get('profissional'):
            payload['profissional'] = agendamento.profissional_id or request.user.profissional_id

        instance = AtendimentoMedico.objects.filter(agendamento=agendamento).first()
        serializer = AtendimentoMedicoSerializer(instance, data=payload)
        serializer.is_valid(raise_exception=True)
        atendimento = serializer.save()

        return Response(AtendimentoMedicoSerializer(atendimento).data, status=status.HTTP_200_OK)


def _escape_pdf_text(value):
    if value is None:
        return ''
    return str(value).replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')


def _build_pdf(pages):
    objects = []

    font_obj = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
    objects.append(font_obj)

    page_objects = []
    content_objects = []

    for lines in pages:
        safe_lines = [_escape_pdf_text(line) for line in lines if line is not None]
        content_lines = []
        for index, line in enumerate(safe_lines):
            if index == 0:
                content_lines.append(f"({line}) Tj")
            else:
                content_lines.append(f"0 -14 Td ({line}) Tj")
        content_stream = "BT /F1 12 Tf 50 760 Td " + " ".join(content_lines) + " ET"
        content_bytes = content_stream.encode('latin-1', 'replace')
        content_obj = f"<< /Length {len(content_bytes)} >>\nstream\n{content_stream}\nendstream"
        content_objects.append(content_obj)
        page_objects.append("pending")

    pages_kids = []
    current_obj_number = 2  # catalog will be 1, pages will be 2
    font_obj_number = 3
    current_obj_number = font_obj_number + 1

    for index in range(len(pages)):
        page_obj_number = current_obj_number
        content_obj_number = current_obj_number + 1
        pages_kids.append(f"{page_obj_number} 0 R")
        page_obj = (
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Resources << /Font << /F1 {font_obj_number} 0 R >> >> "
            f"/Contents {content_obj_number} 0 R >>"
        )
        page_objects[index] = page_obj
        current_obj_number += 2

    pages_obj = f"<< /Type /Pages /Kids [{' '.join(pages_kids)}] /Count {len(pages_kids)} >>"

    catalog_obj = "<< /Type /Catalog /Pages 2 0 R >>"

    ordered_objects = [catalog_obj, pages_obj, objects[0]]
    for page_obj, content_obj in zip(page_objects, content_objects):
        ordered_objects.append(page_obj)
        ordered_objects.append(content_obj)

    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for i, obj in enumerate(ordered_objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{i} 0 obj\n{obj}\nendobj\n".encode('latin-1', 'replace')

    xref_offset = len(pdf)
    pdf += f"xref\n0 {len(ordered_objects)+1}\n".encode('ascii')
    pdf += b"0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode('ascii')
    pdf += (
        f"trailer\n<< /Size {len(ordered_objects)+1} /Root 1 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF"
    ).encode('ascii')
    return pdf


class AtendimentoPdfView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not _has_atendimento_access(request.user):
            return Response({'error': 'Acesso restrito.'}, status=status.HTTP_403_FORBIDDEN)

        documentos = request.data.get('documentos') or []
        if not isinstance(documentos, list) or not documentos:
            return Response({'error': 'Nenhum documento selecionado.'}, status=status.HTTP_400_BAD_REQUEST)

        atendimento_id = request.data.get('atendimento_id')
        agendamento_id = request.data.get('agendamento') or request.data.get('agendamento_id')

        atendimento = None
        if atendimento_id:
            atendimento = get_object_or_404(
                AtendimentoMedico.objects.select_related('agendamento', 'paciente', 'profissional', 'cid_principal', 'cid_secundario'),
                pk=atendimento_id
            )
        elif agendamento_id:
            atendimento = AtendimentoMedico.objects.filter(agendamento_id=agendamento_id).select_related(
                'agendamento', 'paciente', 'profissional', 'cid_principal', 'cid_secundario'
            ).first()

        if atendimento and request.user.profissional_id and atendimento.agendamento.profissional_id != request.user.profissional_id:
            return Response({'error': 'Agendamento nao pertence ao profissional.'}, status=status.HTTP_403_FORBIDDEN)

        dados = None
        if atendimento:
            dados = AtendimentoMedicoSerializer(atendimento).data
        else:
            dados = request.data.get('atendimento') or {}

        paciente = atendimento.paciente if atendimento else None
        profissional = atendimento.profissional if atendimento else None
        agendamento = atendimento.agendamento if atendimento else None

        header = [
            "THECLINIC - DOCUMENTOS DE ATENDIMENTO",
            f"Paciente: {paciente.nome if paciente else dados.get('paciente_nome', '-')}",
            f"Profissional: {profissional.nome if profissional else dados.get('profissional_nome', '-')}",
            f"Data: {agendamento.data if agendamento else dados.get('data', '-')}",
            ""
        ]

        pages = []
        if 'Requisicao de Medicamentos' in documentos:
            linhas = header + ["REQUISICAO DE MEDICAMENTOS", ""]
            for item in (dados.get('prescricao_medicamentos') or []):
                nome = item.get('nome') or item.get('descricao') or '-'
                posologia = item.get('posologia') or ''
                via = item.get('via') or ''
                linhas.append(f"- {nome} | {posologia} | {via}".strip())
            pages.append(linhas)

        if 'Solicitacao de Exames' in documentos:
            linhas = header + ["SOLICITACAO DE EXAMES", ""]
            for item in (dados.get('exames_solicitados') or []):
                nome = item.get('nome') or item.get('descricao') or '-'
                justificativa = item.get('justificativa') or ''
                linhas.append(f"- {nome} | {justificativa}".strip())
            pages.append(linhas)

        if 'Referencia e Contra-referencia de Encaminhamento' in documentos:
            linhas = header + ["REFERENCIA E CONTRA-REFERENCIA", ""]
            linhas.append(dados.get('encaminhamento') or '-')
            pages.append(linhas)

        if 'Ficha de Atendimento da Consulta Atual' in documentos:
            linhas = header + [
                "FICHA DE ATENDIMENTO - CONSULTA",
                "",
                f"Queixa principal: {dados.get('queixa_principal') or '-'}",
                f"Historia da doenca atual: {dados.get('historia_doenca_atual') or '-'}",
                f"Antecedentes pessoais: {dados.get('antecedentes_pessoais') or '-'}",
                f"Antecedentes familiares: {dados.get('antecedentes_familiares') or '-'}",
                f"Alergias: {dados.get('alergias_referidas') or '-'}",
                f"Medicacoes em uso: {dados.get('medicacoes_em_uso') or '-'}",
                f"Habitos de vida: {dados.get('habitos_vida') or '-'}",
                "",
                f"Exame fisico: {dados.get('exame_fisico') or '-'}",
                f"Plano terapeutico: {dados.get('plano_terapeutico') or '-'}",
                f"Orientacoes: {dados.get('orientacoes') or '-'}",
                f"Encaminhamento: {dados.get('encaminhamento') or '-'}",
                f"Observacoes gerais: {dados.get('observacoes_gerais') or '-'}",
                f"Atestado: {dados.get('atestado') or '-'}",
                f"Diagnostico: {dados.get('diagnostico_descricao') or '-'}",
                f"CID principal: {dados.get('cid_principal_codigo') or '-'}",
                f"CID secundario: {dados.get('cid_secundario_codigo') or '-'}",
            ]
            pages.append(linhas)

        if not pages:
            return Response({'error': 'Documentos invalidos.'}, status=status.HTTP_400_BAD_REQUEST)

        pdf_bytes = _build_pdf(pages)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'inline; filename="documentos_atendimento.pdf"'
        return response
