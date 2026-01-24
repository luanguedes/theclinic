import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
    Calendar as CalendarIcon, X, Plus, Trash2, Pencil, Loader2, Save, UserPlus, 
    MapPin, ChevronDown, Check, MessageCircle, User, Baby, Heart, Accessibility, 
    Users, Printer, Clock, Filter, Stethoscope, CalendarDays, CheckCircle2
} from 'lucide-react';
import { generateAppointmentReceipt } from '../utils/generateReceipt';

// --- CSS CUSTOMIZADO PARA AUMENTAR O CALENDÁRIO ---
const calendarStyles = `
  .react-calendar { 
      width: 100% !important; 
      border: none !important; 
      font-family: inherit; 
      background: transparent !important; 
      font-size: 16px; /* Fonte maior */
  }
  .react-calendar__navigation { height: 50px; margin-bottom: 10px; }
  .react-calendar__navigation button { 
      min-width: 40px; 
      background: none; 
      font-size: 18px; /* Mês maior */
      font-weight: 800; 
      text-transform: uppercase;
      color: #334155;
  }
  .dark .react-calendar__navigation button { color: #f8fafc; }
  .react-calendar__month-view__weekdays {
      text-transform: uppercase;
      font-weight: 800;
      font-size: 0.8em;
      color: #94a3b8;
      text-decoration: none !important;
  }
  abbr[title] { text-decoration: none !important; cursor: default !important; }
  
  .react-calendar__tile { 
      padding: 15px 0; /* Células mais altas */
      font-weight: 600;
      border-radius: 12px;
      transition: all 0.2s;
  }
  .react-calendar__tile:enabled:hover { background-color: #f1f5f9; }
  .dark .react-calendar__tile:enabled:hover { background-color: #334155; }
  
  .react-calendar__tile--now { background: transparent !important; color: #0f172a !important; border: none !important; }
  .react-calendar__tile--active { background: transparent !important; color: #2563eb !important; border: 2px solid #2563eb !important; box-shadow: none; }
  
  /* Status dos Dias */
  .dia-livre { background-color: #dcfce7 !important; color: #166534 !important; font-weight: 800; }
  .dark .dia-livre { background-color: #14532d !important; color: #4ade80 !important; }
  
  .dia-feriado { background-color: #f3e8ff !important; color: #6b21a8 !important; }
  .dark .dia-feriado { background-color: #581c87 !important; color: #d8b4fe !important; }
  
  .dia-bloqueado { background-color: #ffedd5 !important; color: #c2410c !important; text-decoration: line-through; opacity: 0.6; }
  .dark .dia-bloqueado { background-color: #7c2d12 !important; color: #fdba74 !important; }
  
  .dia-sem-vagas { background-color: #fee2e2 !important; color: #b91c1c !important; opacity: 0.8; }
  .dark .dia-sem-vagas { background-color: #7f1d1d !important; color: #fca5a5 !important; }
`;

const PRIORIDADES = {
    'idoso': { label: 'Idoso', icon: <Users size={14} />, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    'cadeirante': { label: 'Cadeirante', icon: <Accessibility size={14} />, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    'gestante': { label: 'Gestante', icon: <Baby size={14} />, color: 'text-pink-600 bg-pink-50 border-pink-100' },
    'autista': { label: 'TEA', icon: <Heart size={14} />, color: 'text-teal-600 bg-teal-50 border-teal-100' },
    'pcd': { label: 'PCD', icon: <Accessibility size={14} />, color: 'text-purple-600 bg-purple-50 border-purple-100' },
};

// Componente SearchableSelect Melhorado
const SearchableSelect = ({ label, options, value, onChange, placeholder, disabled, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);
    const safeOptions = Array.isArray(options) ? options : [];

    useEffect(() => { 
        const selected = safeOptions.find(o => String(o.id) === String(value)); 
        if (selected) setQuery(selected.label);
        else if (!value) setQuery('');
    }, [value, safeOptions]); 

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                const selected = safeOptions.find(o => String(o.id) === String(value));
                setQuery(selected ? selected.label : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [containerRef, value, safeOptions]);

    const filtered = (query === '' || query === (safeOptions.find(o => String(o.id) === String(value))?.label)) 
        ? safeOptions 
        : safeOptions.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
    
    return (
        <div className="relative w-full" ref={containerRef}>
            {label && <label className="block text-xs font-black text-slate-500 uppercase mb-1.5 tracking-widest">{label}</label>}
            <div className="relative group">
                {Icon && <Icon className="absolute left-3 top-3 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />}
                <input 
                    type="text" disabled={disabled}
                    className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-all ${Icon ? 'pl-10' : 'pl-3'}`} 
                    value={query} 
                    onFocus={() => !disabled && setIsOpen(true)}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }} 
                    placeholder={placeholder} autoComplete="off"
                />
                <div className="absolute right-3 top-3.5 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            {isOpen && !disabled && (
                <ul className="absolute z-[150] w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-xl shadow-2xl max-h-60 overflow-auto mt-1 text-sm animate-in fade-in zoom-in-95 duration-100">
                    {filtered.length > 0 ? filtered.map(opt => (
                        <li key={opt.id} onMouseDown={() => { onChange(opt.id); setQuery(opt.label); setIsOpen(false); }} className={`p-3 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex justify-between items-center transition-colors ${String(value) === String(opt.id) ? 'bg-blue-50 text-blue-700 font-black' : 'text-slate-600 dark:text-slate-300'}`}>
                            <div className="flex items-center gap-2 truncate">
                                {opt.prioridade && PRIORIDADES[opt.prioridade] && <span className={PRIORIDADES[opt.prioridade].color.split(' ')[1] + " p-1 rounded"}>{PRIORIDADES[opt.prioridade].icon}</span>}
                                {opt.label}
                            </div>
                            {String(value) === String(opt.id) && <Check size={16}/>}
                        </li>
                    )) : <li className="p-4 text-slate-400 text-center text-xs font-bold uppercase">Nenhum resultado</li>}
                </ul>
            )}
        </div>
    );
};

export default function MarcarConsulta() {
  const { api } = useAuth();
  const { notify, confirmDialog } = useNotification();
  
  const [profissionais, setProfissionais] = useState([]);
  const [especialidades, setEspecialidades] = useState([]);
  const [pacientes, setPacientes] = useState([]); 
  const [convenios, setConvenios] = useState([]);
  const [listaBloqueios, setListaBloqueios] = useState([]);
  
  const [profissionalId, setProfissionalId] = useState('');
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [dateValue, setDateValue] = useState(new Date());
  const [dataApi, setDataApi] = useState(new Date().toISOString().split('T')[0]);

  const [modalOpen, setModalOpen] = useState(false);
  const [tipoModal, setTipoModal] = useState(''); 
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [valorSelecionado, setValorSelecionado] = useState(''); 
  const [pacienteId, setPacienteId] = useState('');
  const [convenioId, setConvenioId] = useState('');
  const [enviarWhatsapp, setEnviarWhatsapp] = useState(true);
  const [configSistema, setConfigSistema] = useState(null); 
  
  const [encaixeHora, setEncaixeHora] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [agendamentoIdEditar, setAgendamentoIdEditar] = useState(null); 

  const [modalPacienteOpen, setModalPacienteOpen] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingPaciente, setLoadingPaciente] = useState(false);
  
  const formInicialPaciente = { 
    nome: '', nome_mae: '', sexo: '', cpf: '', data_nascimento: '', telefone: '', email: '', 
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', prioridade: ''
  };
  const [novoPaciente, setNovoPaciente] = useState(formInicialPaciente);

  const hojeIso = new Date().toISOString().split('T')[0];

  const getLocalISODate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
  };

  const isDateInPast = (date) => {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      return date < hoje;
  };

  const getBloqueioAtivo = (dataIso) => {
      const diaMes = dataIso.slice(5);
      return listaBloqueios.find(b => {
          const bateData = (b.data_inicio <= dataIso && b.data_fim >= dataIso);
          const bateRecorrente = b.recorrente && (b.data_inicio.slice(5) === diaMes);
          const bateProf = !b.profissional || (profissionalId && b.profissional === parseInt(profissionalId));
          return (bateData || bateRecorrente) && bateProf;
      });
  };

  useEffect(() => {
    if (api) {
        api.get('configuracoes/sistema/').then(res => setConfigSistema(res.data)).catch(() => {});
        api.get('profissionais/?nopage=true').then(res => {
            const data = res.data.results || res.data;
            setProfissionais(Array.isArray(data) ? data.map(p => ({ id: p.id, label: p.nome })) : []);
        }).catch(() => {});
        api.get('pacientes/lista/?nopage=true').then(res => {
            const data = res.data.results || res.data;
            setPacientes(Array.isArray(data) ? data.map(p => ({ id: p.id, label: `${p.nome} - ${p.cpf}`, prioridade: p.prioridade })) : []);
        }).catch(() => {});
        api.get('configuracoes/convenios/?nopage=true').then(res => {
            const data = res.data.results || res.data;
            setConvenios(Array.isArray(data) ? data.map(c => ({ id: c.id, label: c.nome })) : []);
        }).catch(() => {});
        api.get('bloqueios/').then(res => setListaBloqueios(res.data.results || res.data)).catch(() => {});
    }
  }, [api]);

  useEffect(() => {
    if (profissionalId) {
        api.get(`profissionais/${profissionalId}/`).then(res => {
            if (res.data && Array.isArray(res.data.especialidades)) {
                const specs = res.data.especialidades.map(v => {
                    const code = v.codigo_visual_especialidade || v.codigo_especialidade;
                    return { id: v.especialidade_leitura || v.especialidade_id, label: code ? `${v.nome_especialidade} (${code})` : v.nome_especialidade };
                });
                setEspecialidades(specs);
                if(specs.length === 1) setEspecialidadeId(specs[0].id);
                else setEspecialidadeId('');
            }
        });
        api.get(`agendas/config/?status=todos&profissional_id=${profissionalId}&nopage=true`)
            .then(res => setRegrasProfissional(Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : []));
    }
  }, [profissionalId, api]);

  const [vagasDoDia, setVagasDoDia] = useState([]);
  const [regrasProfissional, setRegrasProfissional] = useState([]); 

  useEffect(() => {
    if (profissionalId && especialidadeId && dataApi) carregarAgenda();
    else setVagasDoDia([]);
  }, [profissionalId, especialidadeId, dataApi, regrasProfissional, listaBloqueios]);

  const carregarAgenda = async () => {
    setLoadingAgenda(true);
    try {
        const res = await api.get(`agendamento/?profissional=${profissionalId}&especialidade=${especialidadeId}&data=${dataApi}`);
        const agendamentos = Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : [];
        gerarVisualizacao(regrasProfissional, agendamentos);
    } catch (e) { setVagasDoDia([]); }
    finally { setLoadingAgenda(false); }
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month') return null;
    const dataIso = getLocalISODate(date);
    const bloqueio = getBloqueioAtivo(dataIso);
    if (bloqueio) return bloqueio.tipo === 'feriado' ? 'dia-feriado' : 'dia-bloqueado';
    if (!especialidadeId) return null;
    const jsDay = date.getDay();
    const regraEncontrada = regrasProfissional.find(r => (r.dia_semana === jsDay) && String(r.especialidade) === String(especialidadeId) && (r.data_inicio <= dataIso && r.data_fim >= dataIso));
    if (regraEncontrada) return regraEncontrada.situacao === false ? 'dia-sem-vagas' : 'dia-livre'; 
    return null;
  };

  const gerarVisualizacao = (regras, agendamentos) => {
    let slots = [];
    const jsDay = dateValue.getDay(); 
    const dataIso = getLocalISODate(dateValue);
    const bloqueioAtivo = getBloqueioAtivo(dataIso);

    const regrasFiltradas = regras.filter(r => r.dia_semana === jsDay && r.data_inicio <= dataApi && r.data_fim >= dataApi && String(r.especialidade) === String(especialidadeId));

    regrasFiltradas.forEach(regra => {
        const valorRegra = parseFloat(regra.valor || 0);
        const agendaEncerrada = (regra.situacao === false) || !!bloqueioAtivo;
        if (regra.tipo === 'fixo') {
            for (let i = 0; i < (regra.quantidade_atendimentos || 1); i++) {
                slots.push({ hora: regra.hora_inicio.slice(0,5), valor: valorRegra, ocupado: false, convenio_regra_nome: regra.convenio_nome, convenio_regra_id: regra.convenio, agenda_fechada: agendaEncerrada });
            }
        } else {
            let atual = parseInt(regra.hora_inicio.split(':')[0]) * 60 + parseInt(regra.hora_inicio.split(':')[1]);
            const fim = parseInt(regra.hora_fim.split(':')[0]) * 60 + parseInt(regra.hora_fim.split(':')[1]);
            while (atual < fim) {
                const h = Math.floor(atual/60).toString().padStart(2,'0');
                const m = (atual%60).toString().padStart(2,'0');
                for (let i = 0; i < (regra.quantidade_atendimentos || 1); i++) {
                    slots.push({ hora: `${h}:${m}`, valor: valorRegra, ocupado: false, convenio_regra_nome: regra.convenio_nome, convenio_regra_id: regra.convenio, agenda_fechada: agendaEncerrada });
                }
                atual += regra.intervalo_minutos;
            }
        }
    });

    let rests = [...agendamentos];
    const final = slots.map(s => {
        const idx = rests.findIndex(a => a.horario.slice(0,5) === s.hora);
        if (idx !== -1) {
            const a = rests.splice(idx, 1)[0];
            return { ...s, ocupado: true, paciente: a.nome_paciente, agendamento_id: a.id, paciente_id: a.paciente, convenio_id: a.convenio, convenio_nome: a.nome_convenio, observacoes: a.observacoes, is_encaixe: a.is_encaixe, valor: parseFloat(a.valor || s.valor), enviar_whatsapp: a.enviar_whatsapp, prioridade: a.paciente_prioridade };
        }
        return s;
    });
    rests.forEach(a => final.push({ hora: a.horario.slice(0,5), valor: parseFloat(a.valor || 0), ocupado: true, paciente: a.nome_paciente, agendamento_id: a.id, is_encaixe: true, paciente_id: a.paciente, convenio_id: a.convenio, convenio_nome: a.nome_convenio, observacoes: a.observacoes, enviar_whatsapp: a.enviar_whatsapp, prioridade: a.paciente_prioridade }));
    setVagasDoDia(final.sort((a,b) => a.hora.localeCompare(b.hora)));
  };

  const salvarAgendamento = async () => {
    if (!pacienteId) return notify.warning("Selecione um paciente.");
    setLoadingSave(true);
    const hora = tipoModal === 'encaixe' ? encaixeHora : horarioSelecionado;
    const bloqueioAtivo = getBloqueioAtivo(dataApi);
    if (tipoModal === 'encaixe' && bloqueioAtivo) {
        const tipoLabel = bloqueioAtivo.tipo === 'feriado' ? 'feriado' : 'bloqueio';
        const confirmado = await confirmDialog(
            `Existe ${tipoLabel} na data selecionada. Deseja agendar mesmo assim?`,
            "Confirmar Encaixe",
            "Sim, agendar",
            "Cancelar",
            "warning"
        );
        if (!confirmado) { setLoadingSave(false); return; }
    }
    try {
        const payload = { profissional: profissionalId, especialidade: especialidadeId, paciente: pacienteId, data: dataApi, horario: hora, convenio: convenioId || null, valor: valorSelecionado, observacoes: observacao, is_encaixe: tipoModal === 'encaixe', enviar_whatsapp: enviarWhatsapp };
        if(agendamentoIdEditar) {
            await api.put(`agendamento/${agendamentoIdEditar}/`, payload);
            notify.success("Agendamento atualizado!");
        } else {
            const { data } = await api.post('agendamento/', payload);
            notify.success("Agendado com sucesso!");
            generateAppointmentReceipt(data);
        }
        setModalOpen(false);
        carregarAgenda();
    } catch (e) { notify.error("Erro ao salvar."); }
    finally { setLoadingSave(false); }
  };

  const handlePrintAgendamento = async (e, slot) => {
    e.stopPropagation();
    if (!slot?.agendamento_id) return;
    try {
        const { data } = await api.get(`agendamento/${slot.agendamento_id}/`);
        generateAppointmentReceipt(data);
    } catch (error) {
        notify.error("Erro ao gerar a guia.");
    }
  };

  const handleExcluirAgendamento = async (e, id) => {
      e.stopPropagation();
      const confirmed = await confirmDialog("Excluir este agendamento?", "Exclusão", "Sim, Excluir", "Cancelar", "danger");
      if (confirmed) {
          try {
              await api.delete(`agendamento/${id}/`);
              notify.success("Removido.");
              carregarAgenda();
          } catch (e) { notify.error("Erro ao excluir."); }
      }
  };

  const mascaraCPF = (v) => v
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14);

  const mascaraTelefone = (v) => v
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);

  const mascaraCEP = (v) => v
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 9);

  const handlePacienteChange = (e) => { 
      let { name, value } = e.target; 
      if (name === 'cpf') value = mascaraCPF(value);
      if (name === 'telefone') value = mascaraTelefone(value);
      if (name === 'cep') value = mascaraCEP(value);
      setNovoPaciente({ ...novoPaciente, [name]: value }); 
  };

  const buscarCep = async () => {
    const cepLimpo = novoPaciente.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) setNovoPaciente(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
    } finally { setLoadingCep(false); }
  };

  const salvarPacienteCompleto = async (e) => {
      e.preventDefault();
      setLoadingPaciente(true); 
      try {
          const payload = { ...novoPaciente, cpf: novoPaciente.cpf.replace(/\D/g, '') };
          const { data } = await api.post('pacientes/', payload);
          notify.success("Paciente cadastrado!");
          setPacientes(prev => [{ id: data.id, label: `${data.nome} - ${data.cpf}`, prioridade: data.prioridade }, ...prev]);
          setModalPacienteOpen(false);
          setPacienteId(data.id);
      } catch (error) { notify.error("Erro ao cadastrar."); } 
      finally { setLoadingPaciente(false); }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 outline-none focus:border-blue-500 text-xs dark:text-white font-semibold";

  return (
    <Layout>
      <style>{calendarStyles}</style>
      <div className="max-w-[1920px] pb-20 pt-2">
        
        {/* CABEÇALHO */}
        <div className="mb-3">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-500/20"><CalendarIcon size={28}/></div>
                Marcar Consulta
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-1 ml-1">Selecione o profissional e a data desejada.</p>
        </div>

        {/* CARD DE FILTROS */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 text-slate-400 font-black uppercase text-xs tracking-widest min-w-fit">
                    <Filter size={16}/> Filtros
                </div>
                <div className="flex-1 w-full"><SearchableSelect icon={User} options={profissionais} value={profissionalId} onChange={setProfissionalId} placeholder="SELECIONE O PROFISSIONAL..." /></div>
                <div className="flex-1 w-full"><SearchableSelect icon={Stethoscope} options={especialidades} value={especialidadeId} onChange={setEspecialidadeId} placeholder="ESPECIALIDADE (CBO)..." disabled={!profissionalId} /></div>
            </div>
        </div>

        {/* GRID PRINCIPAL: 40% Calendar - 60% Slots */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUNA ESQUERDA: CALENDÁRIO (MAIOR) */}
            <div className="lg:col-span-5 space-y-5">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[28px] shadow-lg shadow-blue-500/5 border border-slate-100 dark:border-slate-700 overflow-hidden">
                    <Calendar onChange={(d) => { setDateValue(d); setDataApi(getLocalISODate(d)); }} value={dateValue} locale="pt-BR" tileClassName={getTileClassName}/>
                </div>
                
                {/* LEGENDA (GRANDE E CLARA) */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[22px] border border-slate-200 dark:border-slate-700">
                    <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-3">Legenda de Disponibilidade</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-green-200 border-2 border-green-500"></div><span className="font-bold text-xs text-slate-600 dark:text-slate-300 uppercase">Livre</span></div>
                        <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-orange-200 border-2 border-orange-500"></div><span className="font-bold text-xs text-slate-600 dark:text-slate-300 uppercase">Bloqueio</span></div>
                        <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-purple-200 border-2 border-purple-500"></div><span className="font-bold text-xs text-slate-600 dark:text-slate-300 uppercase">Feriado</span></div>
                        <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-lg bg-red-200 border-2 border-red-500"></div><span className="font-bold text-xs text-slate-600 dark:text-slate-300 uppercase">Lotado</span></div>
                    </div>
                </div>
            </div>

            {/* COLUNA DIREITA: VAGAS */}
            <div className="lg:col-span-7">
                <div className="bg-white dark:bg-slate-800 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col min-h-[560px]">
                    <div className="p-5 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 rounded-t-[28px]">
                        <div>
                            <h3 className="font-black text-lg text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <CalendarDays className="text-blue-500"/>
                                {dateValue.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                            </h3>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                                {loadingAgenda ? 'Buscando...' : `${vagasDoDia.length} Horários Listados`}
                            </p>
                        </div>
                        <button onClick={() => { setTipoModal('encaixe'); setAgendamentoIdEditar(null); setPacienteId(''); setConvenioId(''); setValorSelecionado(''); setModalOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 px-5 rounded-xl text-xs uppercase flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                            <Plus size={16}/> Encaixe Extra
                        </button>
                    </div>
                    
                    <div className="flex-1 p-5 bg-slate-50 dark:bg-slate-900/20 rounded-b-[28px]">
                        {!profissionalId ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <User size={64} className="mb-4 text-slate-300"/>
                                <span className="font-black uppercase tracking-widest text-sm">Selecione um profissional</span>
                            </div>
                        ) : loadingAgenda ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48}/></div>
                        ) : vagasDoDia.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {vagasDoDia.map((slot, idx) => {
                                    const isPast = isDateInPast(dateValue);
                                    const isExpirado = isPast || (dateValue.toDateString() === new Date().toDateString() && slot.hora < new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}));
                                    const isLocked = slot.agenda_fechada && !slot.ocupado; 
                                    const pInfo = slot.prioridade ? PRIORIDADES[slot.prioridade] : null;

                                    return (
                                        <div key={idx} onClick={() => { 
                                            if (!slot.ocupado && !isLocked && !isExpirado) { 
                                                setAgendamentoIdEditar(null); setHorarioSelecionado(slot.hora); setValorSelecionado(slot.valor); 
                                                setConvenioId(slot.convenio_regra_id || ''); setPacienteId(''); setTipoModal('normal'); setModalOpen(true); 
                                            }
                                        }} 
                                        className={`relative group p-4 rounded-2xl border-2 flex flex-col justify-between h-28 transition-all shadow-sm hover:shadow-md ${
                                            slot.ocupado ? 'bg-white border-blue-100 dark:bg-slate-800 dark:border-slate-700' : 
                                            isLocked || isExpirado ? 'bg-slate-100 opacity-50 cursor-not-allowed border-transparent' : 
                                            'bg-white border-green-100 hover:border-green-500 cursor-pointer hover:-translate-y-1'
                                        }`}>
                                            <div className="flex justify-between items-start">
                                                <div className={`font-black text-2xl ${slot.ocupado ? 'text-slate-700 dark:text-slate-300' : 'text-slate-800 dark:text-white group-hover:text-green-600'}`}>{slot.hora}</div>
                                                {slot.ocupado ? (
                                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                ) : (
                                                    <div className={`w-3 h-3 rounded-full ${isLocked ? 'bg-orange-400' : 'bg-green-500'}`}></div>
                                                )}
                                            </div>
                                            
                                            <div className="flex-1 min-w-0 overflow-hidden flex flex-col justify-end">
                                                {slot.ocupado ? (
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-[10px] text-slate-500 uppercase truncate">{slot.paciente}</div>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-[80px]">{slot.convenio_nome || 'PARTICULAR'}</span>
                                                            {pInfo && <span className={`${pInfo.color} p-0.5 rounded`} title={pInfo.label}>{pInfo.icon}</span>}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isLocked ? 'text-orange-400' : isExpirado ? 'text-slate-400' : 'text-green-600'}`}>
                                                        {isLocked ? 'Trancada' : isExpirado ? 'Expirado' : 'Disponível'}
                                                    </span>
                                                )}
                                            </div>

                                            {slot.ocupado && (
                                                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handlePrintAgendamento(e, slot)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 bg-white shadow-sm border"><Printer size={14}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setAgendamentoIdEditar(slot.agendamento_id); setHorarioSelecionado(slot.hora); setPacienteId(slot.paciente_id); setConvenioId(slot.convenio_id || ''); setObservacao(slot.observacoes || ''); setValorSelecionado(slot.valor); setModalOpen(true); }} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 bg-white shadow-sm border"><Pencil size={14}/></button>
                                                    <button onClick={(e) => handleExcluirAgendamento(e, slot.agendamento_id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 bg-white shadow-sm border"><Trash2 size={14}/></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                <CalendarIcon size={64} className="mb-4"/>
                                <span className="font-black uppercase tracking-[0.2em] text-sm">Agenda Vazia</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* MODAL DE AGENDAMENTO */}
        {modalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                        <h3 className="font-black uppercase text-lg tracking-tight flex items-center gap-2">
                            <CheckCircle2 size={24}/> {agendamentoIdEditar ? 'Editar' : 'Confirmar'} Agendamento
                        </h3>
                        <button onClick={() => setModalOpen(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors"><X size={20}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex justify-between items-center text-blue-800 dark:text-blue-300 font-black text-sm border border-blue-100 dark:border-blue-900/30">
                            <span className="flex items-center gap-2 uppercase tracking-wide"><Clock size={18}/> {horarioSelecionado || encaixeHora}</span>
                            <span>{dateValue.toLocaleDateString()}</span>
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Paciente</label>
                                <button onClick={() => setModalPacienteOpen(true)} className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline uppercase tracking-widest"><Plus size={12}/> Novo Cadastro</button>
                            </div>
                            <SearchableSelect options={pacientes} value={pacienteId} onChange={setPacienteId} placeholder="Nome ou CPF..." icon={User}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SearchableSelect label="Convênio" options={convenios} value={convenioId} onChange={setConvenioId} placeholder="Particular" />
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-widest">Valor (R$)</label>
                                <input type="number" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)} />
                            </div>
                        </div>

                        {tipoModal === 'encaixe' && (
                            <div><label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-widest">Hora Encaixe</label><input type="time" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" value={encaixeHora} onChange={e => setEncaixeHora(e.target.value)} /></div>
                        )}

                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-1.5 tracking-widest">Observações</label>
                            <textarea placeholder="Alguma observação importante?" className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium h-24 resize-none" value={observacao} onChange={e => setObservacao(e.target.value)}></textarea>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <input type="checkbox" id="wpp_check" checked={enviarWhatsapp} onChange={e => setEnviarWhatsapp(e.target.checked)} className="w-5 h-5 rounded text-green-600 focus:ring-green-500" />
                            <label htmlFor="wpp_check" className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer uppercase tracking-tight">
                                <MessageCircle size={16} className={enviarWhatsapp ? 'text-green-500' : 'text-slate-400'}/> Enviar confirmação automática via WhatsApp
                            </label>
                        </div>

                        <button onClick={salvarAgendamento} disabled={loadingSave} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all">
                            {loadingSave ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Confirmar Agendamento
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL PACIENTE (MANTIDO ESTRUTURA, MELHORADO ESTILO) */}
        {modalPacienteOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden max-h-[90vh] overflow-y-auto">
                    <div className="bg-slate-900 p-6 text-white flex justify-between items-center sticky top-0 z-10">
                        <h3 className="font-black text-sm uppercase flex items-center gap-2 tracking-widest"><UserPlus size={18} className="text-blue-400"/> Cadastro Rápido de Paciente</h3>
                        <button onClick={() => setModalPacienteOpen(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                    <form onSubmit={salvarPacienteCompleto} className="p-8 grid grid-cols-12 gap-5 text-xs">
                        
                        {/* DADOS PESSOAIS */}
                        <div className="col-span-12 font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 mb-2 mt-1 flex items-center gap-2"><User size={14}/> Identificação</div>
                        <div className="col-span-6"><label className="font-bold block mb-1 uppercase text-slate-500">Nome Completo</label><input name="nome" value={novoPaciente.nome} onChange={handlePacienteChange} className={inputClass} required/></div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">CPF</label><input name="cpf" value={novoPaciente.cpf} onChange={handlePacienteChange} className={inputClass} required/></div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">Prioridade</label>
                            <select name="prioridade" value={novoPaciente.prioridade} onChange={handlePacienteChange} className={inputClass}>
                                <option value="">Nenhuma</option>{Object.entries(PRIORIDADES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">Nascimento</label><input type="date" name="data_nascimento" value={novoPaciente.data_nascimento} onChange={handlePacienteChange} className={inputClass} required max={hojeIso}/></div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">Sexo</label><select name="sexo" value={novoPaciente.sexo} onChange={handlePacienteChange} className={inputClass}><option value="">Selecione...</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option></select></div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">Celular</label><input name="telefone" value={novoPaciente.telefone} onChange={handlePacienteChange} className={inputClass} required/></div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">E-mail</label><input type="email" name="email" value={novoPaciente.email} onChange={handlePacienteChange} className={inputClass}/></div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">Nome da Mãe</label><input name="nome_mae" value={novoPaciente.nome_mae} onChange={handlePacienteChange} className={inputClass}/></div>

                        {/* ENDEREÇO */}
                        <div className="col-span-12 font-black text-slate-400 uppercase tracking-[0.2em] border-b pb-2 mb-2 mt-6 flex items-center gap-2"><MapPin size={14}/> Endereço</div>
                        <div className="col-span-2"><label className="font-bold block mb-1 uppercase text-slate-500">CEP</label><input name="cep" value={novoPaciente.cep} onChange={handlePacienteChange} onBlur={buscarCep} className={inputClass}/>{loadingCep && <span className="text-[10px] text-blue-500 font-bold animate-pulse">Buscando...</span>}</div>
                        <div className="col-span-5"><label className="font-bold block mb-1 uppercase text-slate-500">Logradouro</label><input name="logradouro" value={novoPaciente.logradouro} onChange={handlePacienteChange} className={inputClass}/></div>
                        <div className="col-span-2"><label className="font-bold block mb-1 uppercase text-slate-500">Número</label><input id="numero_paciente_modal" name="numero" value={novoPaciente.numero} onChange={handlePacienteChange} className={inputClass}/></div>
                        <div className="col-span-3"><label className="font-bold block mb-1 uppercase text-slate-500">Complemento</label><input name="complemento" value={novoPaciente.complemento} onChange={handlePacienteChange} className={inputClass}/></div>
                        <div className="col-span-4"><label className="font-bold block mb-1 uppercase text-slate-500">Bairro</label><input name="bairro" value={novoPaciente.bairro} onChange={handlePacienteChange} className={inputClass}/></div>
                        <div className="col-span-4"><label className="font-bold block mb-1 uppercase text-slate-500">Cidade</label><input name="cidade" value={novoPaciente.cidade} onChange={handlePacienteChange} className={inputClass}/></div>
                        <div className="col-span-2"><label className="font-bold block mb-1 uppercase text-slate-500">UF</label><input name="estado" value={novoPaciente.estado} onChange={handlePacienteChange} className={inputClass}/></div>

                        <div className="col-span-12 pt-6 border-t dark:border-slate-700 flex justify-end gap-4 mt-4">
                            <button type="button" onClick={() => setModalPacienteOpen(false)} className="px-8 py-3 rounded-xl bg-slate-100 font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-200 transition-colors">Cancelar</button>
                            <button type="submit" disabled={loadingPaciente} className="px-10 py-3 rounded-xl bg-blue-600 text-white font-black uppercase tracking-widest text-xs hover:bg-blue-700 flex items-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">
                                {loadingPaciente ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Salvar Cadastro
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}
