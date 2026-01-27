import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Layout from '../../components/Layout';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  Stethoscope,
  FileText,
  ClipboardList,
  Pill,
  Microscope,
  ScrollText,
  History
} from 'lucide-react';

const SearchableSelect = ({ label, options, value, onChange, query, setQuery, placeholder, loading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const safeOptions = Array.isArray(options) ? options : [];

  useEffect(() => {
    const selected = safeOptions.find((o) => String(o.id) === String(value));
    if (selected) setQuery(selected.label);
  }, [value, safeOptions, setQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{label}</label>}
      <input
        type="text"
        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
      />
      {isOpen && (
        <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-[200] max-h-60 overflow-auto">
          {loading ? (
            <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
              Carregando...
            </div>
          ) : safeOptions.length > 0 ? safeOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setQuery(opt.label);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
            >
              {opt.label}
            </button>
          )) : (
            <div className="p-4 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
              Nenhum resultado
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function AtendimentoConsultaForm() {
  const { agendamentoId } = useParams();
  const { api } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [agendamento, setAgendamento] = useState(null);
  const [paciente, setPaciente] = useState(null);
  const [triagem, setTriagem] = useState(null);
  const [atendimentoId, setAtendimentoId] = useState(null);

  const [form, setForm] = useState({
    queixa_principal: '',
    historia_doenca_atual: '',
    antecedentes_pessoais: '',
    antecedentes_familiares: '',
    alergias_referidas: '',
    medicacoes_em_uso: '',
    habitos_vida: '',
    exame_fisico: '',
    plano_terapeutico: '',
    orientacoes: '',
    encaminhamento: '',
    observacoes_gerais: '',
    atestado: '',
    prescricao_medicamentos: [],
    exames_solicitados: [],
    cid_principal: null,
    cid_secundario: null,
    diagnostico_descricao: ''
  });

  const [medicamentos, setMedicamentos] = useState([]);
  const [medicamentoQuery, setMedicamentoQuery] = useState('');
  const [medicamentoId, setMedicamentoId] = useState(null);
  const [prescricaoDraft, setPrescricaoDraft] = useState({ posologia: '', via: '', quantidade: '' });
  const [medicamentoLoading, setMedicamentoLoading] = useState(false);

  const [exames, setExames] = useState([]);
  const [exameQuery, setExameQuery] = useState('');
  const [exameId, setExameId] = useState(null);
  const [exameDraft, setExameDraft] = useState({ justificativa: '' });
  const [exameLoading, setExameLoading] = useState(false);

  const [cids, setCids] = useState([]);
  const [cidQuery, setCidQuery] = useState('');
  const [cidSecQuery, setCidSecQuery] = useState('');
  const [cidLoading, setCidLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [documentos, setDocumentos] = useState({
    medicamentos: true,
    exames: true,
    encaminhamento: false,
    ficha: true
  });

  const fimAtendimentoDt = useMemo(() => {
    if (!agendamento?.data || !agendamento?.fim_atendimento) return null;
    const dt = new Date(`${agendamento.data}T${agendamento.fim_atendimento}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }, [agendamento]);

  const finalizadoEditavel = useMemo(() => {
    if (agendamento?.status !== 'finalizado') return true;
    if (!fimAtendimentoDt) return false;
    const janelaMs = 24 * 60 * 60 * 1000;
    return Date.now() - fimAtendimentoDt.getTime() <= janelaMs;
  }, [agendamento, fimAtendimentoDt]);

  const isLocked = agendamento?.status === 'finalizado' && !finalizadoEditavel;

  const janelaFimTexto = useMemo(() => {
    if (!fimAtendimentoDt) return null;
    const fimJanela = new Date(fimAtendimentoDt.getTime() + 24 * 60 * 60 * 1000);
    return fimJanela.toLocaleString('pt-BR');
  }, [fimAtendimentoDt]);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const resAg = await api.get(`agendamento/${agendamentoId}/`);
        setAgendamento(resAg.data);

        if (resAg.data?.paciente) {
          const resPac = await api.get(`pacientes/${resAg.data.paciente}/`);
          setPaciente(resPac.data);
        }

        const resTriagem = await api.get(`atendimento/triagens/?agendamento=${agendamentoId}`);
        const listaTriagem = Array.isArray(resTriagem.data.results || resTriagem.data)
          ? (resTriagem.data.results || resTriagem.data)
          : [];
        if (listaTriagem.length > 0) {
          setTriagem(listaTriagem[0]);
        }

        const resAtendimento = await api.get(`atendimento/medicos/?agendamento=${agendamentoId}`);
        const listaAtendimento = Array.isArray(resAtendimento.data.results || resAtendimento.data)
          ? (resAtendimento.data.results || resAtendimento.data)
          : [];
        if (listaAtendimento.length > 0) {
          const atendimento = listaAtendimento[0];
          setAtendimentoId(atendimento.id);
          setForm({
            queixa_principal: atendimento.queixa_principal || '',
            historia_doenca_atual: atendimento.historia_doenca_atual || '',
            antecedentes_pessoais: atendimento.antecedentes_pessoais || '',
            antecedentes_familiares: atendimento.antecedentes_familiares || '',
            alergias_referidas: atendimento.alergias_referidas || '',
            medicacoes_em_uso: atendimento.medicacoes_em_uso || '',
            habitos_vida: atendimento.habitos_vida || '',
            exame_fisico: atendimento.exame_fisico || '',
            plano_terapeutico: atendimento.plano_terapeutico || '',
            orientacoes: atendimento.orientacoes || '',
            encaminhamento: atendimento.encaminhamento || '',
            observacoes_gerais: atendimento.observacoes_gerais || '',
            atestado: atendimento.atestado || '',
            prescricao_medicamentos: atendimento.prescricao_medicamentos || [],
            exames_solicitados: atendimento.exames_solicitados || [],
            cid_principal: atendimento.cid_principal || null,
            cid_secundario: atendimento.cid_secundario || null,
            diagnostico_descricao: atendimento.diagnostico_descricao || ''
          });
          if (atendimento.cid_principal_codigo || atendimento.cid_principal_nome) {
            setCidQuery(`${atendimento.cid_principal_codigo || ''} ${atendimento.cid_principal_nome || ''}`.trim());
          }
          if (atendimento.cid_secundario_codigo || atendimento.cid_secundario_nome) {
            setCidSecQuery(`${atendimento.cid_secundario_codigo || ''} ${atendimento.cid_secundario_nome || ''}`.trim());
          }
        }
      } catch (error) {
        notify.error('Erro ao carregar dados do atendimento.');
      } finally {
        setLoading(false);
      }
    };

    if (api && agendamentoId) carregarDados();
  }, [api, agendamentoId, notify]);

  useEffect(() => {
    if (!api || !agendamentoId) return undefined;
    let active = true;

    const marcarTelaAberta = async () => {
      try {
        const res = await api.post(`atendimento/iniciar/${agendamentoId}/`);
        if (active && res?.data) {
          setAgendamento(res.data);
        }
      } catch (error) {
        // Silencioso: a tela pode ter sido aberta fora do fluxo padrao.
      }
    };

    marcarTelaAberta();

    return () => {
      active = false;
      api.post(`atendimento/pausar/${agendamentoId}/`).catch(() => {});
    };
  }, [api, agendamentoId]);

  useEffect(() => {
    if (!medicamentoQuery || medicamentoQuery.length < 2) {
      setMedicamentos([]);
      return;
    }
    let active = true;
    setMedicamentoLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`cadastros/medicamentos/?search=${encodeURIComponent(medicamentoQuery)}`);
        const lista = Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : [];
        if (active) {
          setMedicamentos(lista.map((m) => ({ id: m.id, label: m.nome_busca || m.nome })));
        }
      } catch (error) {
        if (active) setMedicamentos([]);
      } finally {
        if (active) setMedicamentoLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, medicamentoQuery]);

  useEffect(() => {
    if (!exameQuery || exameQuery.length < 2) {
      setExames([]);
      return;
    }
    let active = true;
    setExameLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`cadastros/exames/?search=${encodeURIComponent(exameQuery)}`);
        const lista = Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : [];
        if (active) {
          setExames(lista.map((e) => ({ id: e.id, label: e.search_text || e.nome })));
        }
      } catch (error) {
        if (active) setExames([]);
      } finally {
        if (active) setExameLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, exameQuery]);

  useEffect(() => {
    if ((!cidQuery || cidQuery.length < 2) && (!cidSecQuery || cidSecQuery.length < 2)) {
      setCids([]);
      return;
    }
    let active = true;
    setCidLoading(true);
    const query = cidQuery.length >= 2 ? cidQuery : cidSecQuery;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`cadastros/cids/?search=${encodeURIComponent(query)}`);
        const lista = Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : [];
        if (active) {
          setCids(lista.map((c) => ({ id: c.id, label: c.search_text || `${c.codigo} ${c.nome}` })));
        }
      } catch (error) {
        if (active) setCids([]);
      } finally {
        if (active) setCidLoading(false);
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [api, cidQuery, cidSecQuery]);

  const adicionarMedicamento = () => {
    if (!medicamentoId) {
      notify.warning('Selecione um medicamento.');
      return;
    }
    const selecionado = medicamentos.find((m) => String(m.id) === String(medicamentoId));
    setForm((prev) => ({
      ...prev,
      prescricao_medicamentos: [
        ...prev.prescricao_medicamentos,
        {
          id: medicamentoId,
          nome: selecionado?.label || medicamentoQuery,
          ...prescricaoDraft
        }
      ]
    }));
    setMedicamentoId(null);
    setMedicamentoQuery('');
    setPrescricaoDraft({ posologia: '', via: '', quantidade: '' });
  };

  const removerMedicamento = (index) => {
    setForm((prev) => ({
      ...prev,
      prescricao_medicamentos: prev.prescricao_medicamentos.filter((_, i) => i !== index)
    }));
  };

  const adicionarExame = () => {
    if (!exameId) {
      notify.warning('Selecione um exame.');
      return;
    }
    const selecionado = exames.find((e) => String(e.id) === String(exameId));
    setForm((prev) => ({
      ...prev,
      exames_solicitados: [
        ...prev.exames_solicitados,
        {
          id: exameId,
          nome: selecionado?.label || exameQuery,
          ...exameDraft
        }
      ]
    }));
    setExameId(null);
    setExameQuery('');
    setExameDraft({ justificativa: '' });
  };

  const removerExame = (index) => {
    setForm((prev) => ({
      ...prev,
      exames_solicitados: prev.exames_solicitados.filter((_, i) => i !== index)
    }));
  };

  const salvarAtendimento = async ({ silent = false } = {}) => {
    if (!agendamentoId) return;
    if (isLocked) {
      notify.warning('Atendimento finalizado ha mais de 24h. Edicao bloqueada.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        agendamento: agendamentoId
      };
      const res = await api.post('atendimento/salvar/', payload);
      setAtendimentoId(res.data.id);
      const resAg = await api.get(`agendamento/${agendamentoId}/`);
      setAgendamento(resAg.data);
      if (!silent) notify.success('Atendimento salvo com sucesso.');
    } catch (error) {
      if (!silent) notify.error('Erro ao salvar atendimento.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const finalizarAtendimento = async () => {
    if (!agendamentoId) return;
    if (isLocked) {
      notify.warning('Atendimento finalizado ha mais de 24h. Edicao bloqueada.');
      return;
    }
    setFinalizing(true);
    try {
      await salvarAtendimento({ silent: true });
      const res = await api.post(`atendimento/finalizar/${agendamentoId}/`);
      setAgendamento(res.data);
      notify.success('Atendimento finalizado.');
      navigate('/atendimento-consultas');
    } catch (error) {
      notify.error('Erro ao finalizar atendimento.');
    } finally {
      setFinalizing(false);
    }
  };

  const gerarPdf = async () => {
    const selecionados = [];
    if (documentos.medicamentos) selecionados.push('Requisicao de Medicamentos');
    if (documentos.exames) selecionados.push('Solicitacao de Exames');
    if (documentos.encaminhamento) selecionados.push('Referencia e Contra-referencia de Encaminhamento');
    if (documentos.ficha) selecionados.push('Ficha de Atendimento da Consulta Atual');

    if (selecionados.length === 0) {
      notify.warning('Selecione ao menos um documento.');
      return;
    }

    try {
      const payload = {
        documentos: selecionados,
        agendamento: agendamentoId,
        atendimento_id: atendimentoId,
        atendimento: form,
        paciente_nome: paciente?.nome,
        profissional_nome: agendamento?.nome_profissional,
        data: agendamento?.data
      };
      const res = await api.post('atendimento/gerar-pdf/', payload, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
      setModalOpen(false);
    } catch (error) {
      notify.error('Erro ao gerar PDF.');
    }
  };

  const sections = useMemo(() => ([
    { id: 'triagem', label: 'Triagem', icon: ClipboardList },
    { id: 'anamnese', label: 'Anamnese', icon: ScrollText },
    { id: 'exame-fisico', label: 'Exame Fisico', icon: Stethoscope },
    { id: 'prescricao', label: 'Prescricao', icon: Pill },
    { id: 'exames', label: 'Exames', icon: Microscope },
    { id: 'diagnostico', label: 'Diagnostico', icon: FileText },
    { id: 'encaminhamento', label: 'Encaminhamento', icon: CheckCircle2 }
  ]), []);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto pb-20 tracking-tight">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 min-h-[320px] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-20 tracking-tight">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/atendimento-consultas')}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                <CheckCircle2 className="text-emerald-600" size={32} /> Atendimento Medico
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Registro completo da consulta.</p>
            </div>
          </div>
          <button
            type="button"
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <History size={14} /> Historico de Atendimento
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Paciente</div>
              <div className="text-xl font-black text-slate-800 dark:text-white uppercase">
                {paciente?.nome || agendamento?.nome_paciente}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {paciente?.data_nascimento || agendamento?.detalhes_pdf?.paciente_nascimento} • Mae: {paciente?.nome_mae || agendamento?.detalhes_pdf?.paciente_mae || '-'}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Atendimento</div>
              <div className="text-sm font-black text-slate-700 dark:text-slate-200">
                {agendamento?.data} • {agendamento?.horario?.slice(0, 5)} • {agendamento?.nome_profissional}
              </div>
            </div>
          </div>
        </div>

        {agendamento?.status === 'finalizado' && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs font-bold uppercase tracking-widest ${
              finalizadoEditavel
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
            }`}
          >
            {finalizadoEditavel
              ? `Atendimento finalizado. Edicao permitida por 24h${janelaFimTexto ? ` (ate ${janelaFimTexto}).` : '.'}`
              : 'Atendimento finalizado ha mais de 24h. Edicao bloqueada.'}
          </div>
        )}

        <div className="sticky top-20 z-[50] bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-[20px] shadow-sm p-3 mb-6 flex flex-wrap gap-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
              >
                <Icon size={12} /> {section.label}
              </button>
            );
          })}
        </div>

        <div id="triagem" className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Triagem</h4>
          {triagem ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-slate-600 dark:text-slate-200">
              <div>Queixa: <span className="text-slate-800 dark:text-white">{triagem.queixa_principal || '-'}</span></div>
              <div>Pressao: <span className="text-slate-800 dark:text-white">{triagem.pressao_sistolica || '-'} / {triagem.pressao_diastolica || '-'}</span></div>
              <div>Temperatura: <span className="text-slate-800 dark:text-white">{triagem.temperatura_c || '-'} C</span></div>
              <div>Peso: <span className="text-slate-800 dark:text-white">{triagem.peso_kg || '-'} kg</span></div>
              <div>Altura: <span className="text-slate-800 dark:text-white">{triagem.altura_cm || '-'} cm</span></div>
              <div>IMC: <span className="text-slate-800 dark:text-white">{triagem.imc || '-'}</span></div>
              <div className="md:col-span-3">Observacoes: <span className="text-slate-800 dark:text-white">{triagem.observacoes_gerais || '-'}</span></div>
            </div>
          ) : (
            <div className="text-xs font-bold text-slate-400">Triagem nao registrada.</div>
          )}
        </div>

        <div id="anamnese" className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Anamnese</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelClass}>Queixa Principal</label>
              <textarea value={form.queixa_principal} onChange={(e) => setForm({ ...form, queixa_principal: e.target.value })} className={`${inputClass} min-h-[90px]`} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Historia da Doenca Atual</label>
              <textarea value={form.historia_doenca_atual} onChange={(e) => setForm({ ...form, historia_doenca_atual: e.target.value })} className={`${inputClass} min-h-[90px]`} />
            </div>
            <div>
              <label className={labelClass}>Antecedentes Pessoais</label>
              <textarea value={form.antecedentes_pessoais} onChange={(e) => setForm({ ...form, antecedentes_pessoais: e.target.value })} className={`${inputClass} min-h-[90px]`} />
            </div>
            <div>
              <label className={labelClass}>Antecedentes Familiares</label>
              <textarea value={form.antecedentes_familiares} onChange={(e) => setForm({ ...form, antecedentes_familiares: e.target.value })} className={`${inputClass} min-h-[90px]`} />
            </div>
            <div>
              <label className={labelClass}>Alergias Referidas</label>
              <input value={form.alergias_referidas} onChange={(e) => setForm({ ...form, alergias_referidas: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Medicacoes em Uso</label>
              <input value={form.medicacoes_em_uso} onChange={(e) => setForm({ ...form, medicacoes_em_uso: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Habitos de Vida</label>
              <textarea value={form.habitos_vida} onChange={(e) => setForm({ ...form, habitos_vida: e.target.value })} className={`${inputClass} min-h-[80px]`} />
            </div>
          </div>
        </div>

        <div id="exame-fisico" className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Exame Fisico</h4>
          <textarea value={form.exame_fisico} onChange={(e) => setForm({ ...form, exame_fisico: e.target.value })} className={`${inputClass} min-h-[120px]`} />
        </div>

        <div id="prescricao" className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Prescricao de Medicamentos</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <SearchableSelect
                label="Medicamento"
                options={medicamentos}
                value={medicamentoId}
                onChange={setMedicamentoId}
                query={medicamentoQuery}
                setQuery={setMedicamentoQuery}
                placeholder="Buscar medicamento..."
                loading={medicamentoLoading}
              />
            </div>
            <div>
              <label className={labelClass}>Posologia</label>
              <input value={prescricaoDraft.posologia} onChange={(e) => setPrescricaoDraft({ ...prescricaoDraft, posologia: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Via</label>
              <input value={prescricaoDraft.via} onChange={(e) => setPrescricaoDraft({ ...prescricaoDraft, via: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Qtd.</label>
              <input value={prescricaoDraft.quantidade} onChange={(e) => setPrescricaoDraft({ ...prescricaoDraft, quantidade: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-4">
              <button type="button" onClick={adicionarMedicamento} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest">
                Adicionar Medicamento
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {form.prescricao_medicamentos.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-200">
                <span>{item.nome} • {item.posologia} • {item.via} {item.quantidade ? `(${item.quantidade})` : ''}</span>
                <button type="button" onClick={() => removerMedicamento(index)} className="text-rose-500 text-[10px] font-black uppercase">Remover</button>
              </div>
            ))}
            {form.prescricao_medicamentos.length === 0 && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum medicamento adicionado.</div>
            )}
          </div>
        </div>

        <div id="exames" className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Requisicao de Exames</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <SearchableSelect
                label="Exame / Procedimento"
                options={exames}
                value={exameId}
                onChange={setExameId}
                query={exameQuery}
                setQuery={setExameQuery}
                placeholder="Buscar exame..."
                loading={exameLoading}
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Justificativa</label>
              <input value={exameDraft.justificativa} onChange={(e) => setExameDraft({ ...exameDraft, justificativa: e.target.value })} className={inputClass} />
            </div>
            <div className="md:col-span-4">
              <button type="button" onClick={adicionarExame} className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest">
                Adicionar Exame
              </button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {form.exames_solicitados.map((item, index) => (
              <div key={`${item.id}-${index}`} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-200">
                <span>{item.nome} • {item.justificativa}</span>
                <button type="button" onClick={() => removerExame(index)} className="text-rose-500 text-[10px] font-black uppercase">Remover</button>
              </div>
            ))}
            {form.exames_solicitados.length === 0 && (
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum exame adicionado.</div>
            )}
          </div>
        </div>

        <div id="diagnostico" className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Diagnostico</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SearchableSelect
              label="CID Principal"
              options={cids}
              value={form.cid_principal}
              onChange={(val) => setForm({ ...form, cid_principal: val })}
              query={cidQuery}
              setQuery={setCidQuery}
              placeholder="Buscar CID..."
              loading={cidLoading}
            />
            <SearchableSelect
              label="CID Secundario"
              options={cids}
              value={form.cid_secundario}
              onChange={(val) => setForm({ ...form, cid_secundario: val })}
              query={cidSecQuery}
              setQuery={setCidSecQuery}
              placeholder="Buscar CID..."
              loading={cidLoading}
            />
            <div className="md:col-span-2">
              <label className={labelClass}>Descricao Diagnostica</label>
              <textarea value={form.diagnostico_descricao} onChange={(e) => setForm({ ...form, diagnostico_descricao: e.target.value })} className={`${inputClass} min-h-[100px]`} />
            </div>
          </div>
        </div>

        <div id="encaminhamento" className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Plano Terapeutico e Encaminhamento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Plano Terapeutico</label>
              <textarea value={form.plano_terapeutico} onChange={(e) => setForm({ ...form, plano_terapeutico: e.target.value })} className={`${inputClass} min-h-[100px]`} />
            </div>
            <div>
              <label className={labelClass}>Encaminhamento</label>
              <textarea value={form.encaminhamento} onChange={(e) => setForm({ ...form, encaminhamento: e.target.value })} className={`${inputClass} min-h-[100px]`} />
            </div>
            <div>
              <label className={labelClass}>Orientacoes ao Paciente</label>
              <textarea value={form.orientacoes} onChange={(e) => setForm({ ...form, orientacoes: e.target.value })} className={`${inputClass} min-h-[100px]`} />
            </div>
            <div>
              <label className={labelClass}>Atestado / Declaracoes</label>
              <textarea value={form.atestado} onChange={(e) => setForm({ ...form, atestado: e.target.value })} className={`${inputClass} min-h-[100px]`} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Observacoes Gerais</label>
              <textarea value={form.observacoes_gerais} onChange={(e) => setForm({ ...form, observacoes_gerais: e.target.value })} className={`${inputClass} min-h-[100px]`} />
            </div>
          </div>
          <div className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Dados sensiveis protegidos pela LGPD. Registre apenas informacoes necessarias ao cuidado.
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 justify-end">
          <button
            onClick={() => setModalOpen(true)}
            disabled={isLocked}
            className="px-8 py-3 bg-white border border-slate-200 dark:border-slate-700 text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileText size={16} /> Gerar Documentos
          </button>
          <button
            onClick={salvarAtendimento}
            disabled={saving || finalizing || isLocked}
            className="px-10 py-3 bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Salvar Atendimento
          </button>
          <button
            onClick={finalizarAtendimento}
            disabled={saving || finalizing || isLocked}
            className="px-10 py-3 bg-purple-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all flex items-center gap-2 justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {finalizing ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Finalizar Atendimento
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Selecionar Documentos</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gere um unico PDF</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 text-xs font-black uppercase">Fechar</button>
            </div>
            <div className="p-6 space-y-3 text-xs font-bold text-slate-600 dark:text-slate-200">
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                Requisicao de Medicamentos
                <input type="checkbox" checked={documentos.medicamentos} onChange={(e) => setDocumentos({ ...documentos, medicamentos: e.target.checked })} />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                Solicitacao de Exames
                <input type="checkbox" checked={documentos.exames} onChange={(e) => setDocumentos({ ...documentos, exames: e.target.checked })} />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                Referencia e Contra-referencia
                <input type="checkbox" checked={documentos.encaminhamento} onChange={(e) => setDocumentos({ ...documentos, encaminhamento: e.target.checked })} />
              </label>
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                Ficha da Consulta Atual
                <input type="checkbox" checked={documentos.ficha} onChange={(e) => setDocumentos({ ...documentos, ficha: e.target.checked })} />
              </label>
            </div>
            <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
              <button onClick={() => setModalOpen(false)} className="px-6 py-2 text-slate-500 font-black uppercase text-[10px] tracking-widest">
                Cancelar
              </button>
              <button onClick={gerarPdf} className="px-6 py-2 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-blue-500/20">
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
