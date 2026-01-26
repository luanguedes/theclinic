from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('agendamento', '0008_alter_agendamento_id_alter_bloqueioagenda_id'),
        ('configuracoes', '0007_alter_configuracaosistema_id_alter_convenio_id_and_more'),
        ('pacientes', '0005_alter_paciente_id'),
        ('profissionais', '0003_alter_especialidade_id_alter_profissional_id_and_more'),
        ('atendimento', '0004_alter_triagem_id'),
    ]

    operations = [
        migrations.CreateModel(
            name='AtendimentoMedico',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('queixa_principal', models.TextField(blank=True)),
                ('historia_doenca_atual', models.TextField(blank=True)),
                ('antecedentes_pessoais', models.TextField(blank=True)),
                ('antecedentes_familiares', models.TextField(blank=True)),
                ('alergias_referidas', models.TextField(blank=True)),
                ('medicacoes_em_uso', models.TextField(blank=True)),
                ('habitos_vida', models.TextField(blank=True)),
                ('exame_fisico', models.TextField(blank=True)),
                ('plano_terapeutico', models.TextField(blank=True)),
                ('orientacoes', models.TextField(blank=True)),
                ('encaminhamento', models.TextField(blank=True)),
                ('observacoes_gerais', models.TextField(blank=True)),
                ('atestado', models.TextField(blank=True)),
                ('prescricao_medicamentos', models.JSONField(blank=True, default=list, null=True)),
                ('exames_solicitados', models.JSONField(blank=True, default=list, null=True)),
                ('diagnostico_descricao', models.TextField(blank=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('agendamento', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='atendimento_medico', to='agendamento.agendamento')),
                ('cid_principal', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='atendimentos_principais', to='configuracoes.cid')),
                ('cid_secundario', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='atendimentos_secundarios', to='configuracoes.cid')),
                ('paciente', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='atendimentos_medicos', to='pacientes.paciente')),
                ('profissional', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='atendimentos_medicos', to='profissionais.profissional')),
            ],
        ),
    ]
