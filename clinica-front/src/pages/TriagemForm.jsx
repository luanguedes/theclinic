import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { ArrowLeft, CheckCircle2, Loader2, Save, Stethoscope } from 'lucide-react';

const HISTORICO_FLAGS = [
  { key: 'hipertensao', label: 'Hipertensao' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'asma', label: 'Asma' },
  { key: 'cardiopatia', label: 'Cardiopatia' },
  { key: 'tabagismo', label: 'Tabagismo' },
  { key: 'alcool', label: 'Alcool' }
];

const calcularImc = (pesoKg, alturaCm) => {
  if (!pesoKg || !alturaCm) return null;
  const alturaM = alturaCm / 100;
  if (alturaM <= 0) return null;
  const imc = pesoKg / (alturaM * alturaM);
  return Number.isFinite(imc) ? Math.round(imc * 100) / 100 : null;
};

const classificarImc = (imc) => {
  if (imc == null) return '-';
  if (imc < 18.5) return 'Baixo Peso';
  if (imc < 25) return 'Peso Normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade Grau I';
  if (imc < 40) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
};

const classificarObesidade = (imc) => {
  if (imc == null) return '-';
  if (imc < 30) return 'Sem Obesidade';
  if (imc < 35) return 'Obesidade Grau I';
  if (imc < 40) return 'Obesidade Grau II';
  return 'Obesidade Grau III';
};

const classificarPressao = (sistolica, diastolica) => {
  if (!sistolica || !diastolica) return '-';
  if (sistolica >= 180 || diastolica >= 120) return 'Crise Hipertensiva';
  if (sistolica >= 140 || diastolica >= 90) return 'Hipertensao Grau 2';
  if (sistolica >= 130 || diastolica >= 80) return 'Hipertensao Grau 1';
  if (sistolica >= 120 && sistolica <= 129 && diastolica < 80) return 'Pressao Elevada';
  return 'Pressao Normal';
};

export default function TriagemForm() {
  const { agendamentoId } = useParams();
  const { api } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agendamento, setAgendamento] = useState(null);
  const [triagemId, setTriagemId] = useState(null);

  const [triagemForm, setTriagemForm] = useState({
    queixa_principal: '',
    observacoes_gerais: '',
    alergias: '',
    medicacoes_em_uso: '',
    historico_relevante: '',
    historico_flags: {},
    peso_kg: '',
    altura_cm: '',
    pressao_sistolica: '',
    pressao_diastolica: '',
    temperatura_c: '',
    frequencia_cardiaca: '',
    frequencia_respiratoria: '',
    saturacao: '',
    glicemia_capilar: ''
  });

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const resAg = await api.get(`agendamento/${agendamentoId}/`);
        setAgendamento(resAg.data);

        const resTriagem = await api.get(`atendimento/triagens/?agendamento=${agendamentoId}`);
        const lista = Array.isArray(resTriagem.data.results || resTriagem.data) ? (resTriagem.data.results || resTriagem.data) : [];
        if (lista.length > 0) {
          const triagem = lista[0];
          setTriagemId(triagem.id);
          setTriagemForm({
            queixa_principal: triagem.queixa_principal || '',
            observacoes_gerais: triagem.observacoes_gerais || '',
            alergias: triagem.alergias || '',
            medicacoes_em_uso: triagem.medicacoes_em_uso || '',
            historico_relevante: triagem.historico_relevante || '',
            historico_flags: triagem.historico_flags || {},
            peso_kg: triagem.peso_kg ?? '',
            altura_cm: triagem.altura_cm ?? '',
            pressao_sistolica: triagem.pressao_sistolica ?? '',
            pressao_diastolica: triagem.pressao_diastolica ?? '',
            temperatura_c: triagem.temperatura_c ?? '',
            frequencia_cardiaca: triagem.frequencia_cardiaca ?? '',
            frequencia_respiratoria: triagem.frequencia_respiratoria ?? '',
            saturacao: triagem.saturacao ?? '',
            glicemia_capilar: triagem.glicemia_capilar ?? ''
          });
        }
      } catch (error) {
        notify.error('Erro ao carregar dados da triagem.');
      } finally {
        setLoading(false);
      }
    };

    if (api && agendamentoId) {
      carregarDados();
    }
  }, [api, agendamentoId, notify]);

  const toggleHistorico = (key) => {
    setTriagemForm((prev) => ({
      ...prev,
      historico_flags: {
        ...(prev.historico_flags || {}),
        [key]: !(prev.historico_flags || {})[key]
      }
    }));
  };

  const salvarTriagem = async () => {
    if (!agendamento) return;
    if (!triagemForm.queixa_principal?.trim()) {
      notify.warning('Informe a queixa principal.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        agendamento: agendamento.id,
        queixa_principal: triagemForm.queixa_principal,
        observacoes_gerais: triagemForm.observacoes_gerais,
        alergias: triagemForm.alergias,
        medicacoes_em_uso: triagemForm.medicacoes_em_uso,
        historico_relevante: triagemForm.historico_relevante,
        historico_flags: triagemForm.historico_flags,
        peso_kg: triagemForm.peso_kg || null,
        altura_cm: triagemForm.altura_cm || null,
        pressao_sistolica: triagemForm.pressao_sistolica || null,
        pressao_diastolica: triagemForm.pressao_diastolica || null,
        temperatura_c: triagemForm.temperatura_c || null,
        frequencia_cardiaca: triagemForm.frequencia_cardiaca || null,
        frequencia_respiratoria: triagemForm.frequencia_respiratoria || null,
        saturacao: triagemForm.saturacao || null,
        glicemia_capilar: triagemForm.glicemia_capilar || null
      };

      if (triagemId) {
        await api.put(`atendimento/triagens/${triagemId}/`, payload);
      } else {
        await api.post('atendimento/triagens/', payload);
      }

      notify.success('Triagem salva com sucesso.');
      navigate('/triagem');
    } catch (error) {
      notify.error('Erro ao salvar triagem.');
    } finally {
      setSaving(false);
    }
  };

  const pesoNum = Number(String(triagemForm.peso_kg || '').replace(',', '.'));
  const alturaNum = Number(String(triagemForm.altura_cm || '').replace(',', '.'));
  const imc = useMemo(() => calcularImc(pesoNum, alturaNum), [pesoNum, alturaNum]);
  const classificacaoImc = classificarImc(imc);
  const obesidadeGrau = classificarObesidade(imc);
  const pressaoClassificacao = useMemo(() => {
    const sistolica = Number(triagemForm.pressao_sistolica);
    const diastolica = Number(triagemForm.pressao_diastolica);
    if (!sistolica || !diastolica) return '-';
    return classificarPressao(sistolica, diastolica);
  }, [triagemForm.pressao_sistolica, triagemForm.pressao_diastolica]);

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-20 tracking-tight">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/triagem')}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Voltar"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                <CheckCircle2 className="text-blue-600" size={32} /> Triagem
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Preenchimento completo do pre-atendimento.</p>
          </div>
        </div>

        {loading ? (
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 min-h-[320px] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-slate-400">Paciente</div>
                  <div className="text-xl font-black text-slate-800 dark:text-white uppercase">
                    {agendamento?.nome_paciente}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {agendamento?.nome_profissional} • {agendamento?.nome_especialidade}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atendimento</div>
                  <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                    {agendamento?.data} • {agendamento?.horario?.slice(0, 5)}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Pre-atendimento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className={labelClass}>Queixa Principal</label>
                  <input
                    value={triagemForm.queixa_principal}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, queixa_principal: e.target.value }))}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Observacoes Gerais</label>
                  <textarea
                    value={triagemForm.observacoes_gerais}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, observacoes_gerais: e.target.value }))}
                    className={`${inputClass} min-h-[120px]`}
                    maxLength={1000}
                  />
                  <div className="text-[10px] font-bold text-slate-400 mt-1 text-right">
                    {triagemForm.observacoes_gerais.length}/1000
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Alergias (separar por virgula)</label>
                  <input
                    value={triagemForm.alergias}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, alergias: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Medicacoes em Uso (separar por virgula)</label>
                  <input
                    value={triagemForm.medicacoes_em_uso}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, medicacoes_em_uso: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Historico Relevante</label>
                  <textarea
                    value={triagemForm.historico_relevante}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, historico_relevante: e.target.value }))}
                    className={`${inputClass} min-h-[100px]`}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Marcadores Rapidos</div>
                  <div className="flex flex-wrap gap-2">
                    {HISTORICO_FLAGS.map((flag) => (
                      <button
                        key={flag.key}
                        type="button"
                        onClick={() => toggleHistorico(flag.key)}
                        className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${triagemForm.historico_flags?.[flag.key] ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'}`}
                      >
                        {flag.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2 flex items-center gap-2">
                <Stethoscope size={14} /> Metricas Vitais
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <label className={labelClass}>Peso (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={triagemForm.peso_kg}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, peso_kg: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Altura (cm)</label>
                  <input
                    type="number"
                    value={triagemForm.altura_cm}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, altura_cm: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Pressao Sistolica</label>
                  <input
                    type="number"
                    value={triagemForm.pressao_sistolica}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, pressao_sistolica: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Pressao Diastolica</label>
                  <input
                    type="number"
                    value={triagemForm.pressao_diastolica}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, pressao_diastolica: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Temperatura (C)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={triagemForm.temperatura_c}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, temperatura_c: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Batimentos (bpm)</label>
                  <input
                    type="number"
                    value={triagemForm.frequencia_cardiaca}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, frequencia_cardiaca: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Frequencia Respiratoria</label>
                  <input
                    type="number"
                    value={triagemForm.frequencia_respiratoria}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, frequencia_respiratoria: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Saturacao (%)</label>
                  <input
                    type="number"
                    value={triagemForm.saturacao}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, saturacao: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Glicemia Capilar</label>
                  <input
                    type="number"
                    step="0.1"
                    value={triagemForm.glicemia_capilar}
                    onChange={(e) => setTriagemForm((prev) => ({ ...prev, glicemia_capilar: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">IMC</div>
                <div className="text-2xl font-black text-blue-600">{imc ?? '-'}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Classificacao IMC</div>
                <div className="text-sm font-black text-slate-700 dark:text-slate-200">{classificacaoImc}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Obesidade</div>
                <div className="text-sm font-black text-slate-700 dark:text-slate-200">{obesidadeGrau}</div>
              </div>
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-5">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Classificacao Pressao</div>
                <div className="text-sm font-black text-slate-700 dark:text-slate-200">{pressaoClassificacao}</div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-3 justify-end">
              <button
                onClick={() => navigate('/triagem')}
                className="px-6 py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvarTriagem}
                disabled={saving}
                className="px-10 py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 justify-center"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar Triagem
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
