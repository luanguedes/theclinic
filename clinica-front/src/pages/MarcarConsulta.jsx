import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
    Calendar as CalendarIcon, X, Plus, Trash2, Pencil, Loader2, Save, UserPlus, 
    MapPin, ChevronDown, Check, MessageCircle, User, Baby, Heart, Accessibility, Users, Printer
} from 'lucide-react';
import { generateAppointmentReceipt } from '../utils/generateReceipt';

// Estilos compactos para o calendário
const calendarStyles = `
  .react-calendar { width: 100%; border: none; font-family: inherit; background: transparent; font-size: 12px; }
  .react-calendar__tile { padding: 6px 0; }
  .react-calendar__tile--now { background: transparent !important; color: #2563eb !important; border: 1px solid #2563eb !important; border-radius: 8px; }
  .dia-livre { background-color: #dcfce7 !important; color: #166534 !important; font-weight: bold; border-radius: 8px; }
  .dia-feriado { background-color: #f3e8ff !important; color: #6b21a8 !important; opacity: 0.8; border-radius: 8px; }
  .dia-bloqueado { background-color: #ffedd5 !important; color: #c2410c !important; text-decoration: line-through; opacity: 0.6; border-radius: 8px; }
  .dia-sem-vagas { background-color: #fee2e2 !important; color: #b91c1c !important; opacity: 0.7; border-radius: 8px; }
  .react-calendar__tile--active { background: #2563eb !important; color: white !important; border-radius: 8px; }
  .react-calendar__navigation button { min-width: 30px; background: none; font-size: 16px; font-weight: bold; }
`;

const PRIORIDADES = {
    'idoso': { label: 'Idoso', icon: <Users size={12} />, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    'cadeirante': { label: 'Cadeirante', icon: <Accessibility size={12} />, color: 'text-blue-600 bg-blue-50 border-blue-100' },
    'gestante': { label: 'Gestante', icon: <Baby size={12} />, color: 'text-pink-600 bg-pink-50 border-pink-100' },
    'autista': { label: 'TEA', icon: <Heart size={12} />, color: 'text-teal-600 bg-teal-50 border-teal-100' },
    'pcd': { label: 'PCD', icon: <Accessibility size={12} />, color: 'text-purple-600 bg-purple-50 border-purple-100' },
};

// Componente Select Compacto
const SearchableSelect = ({ label, options, value, onChange, placeholder, disabled }) => {
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
        <div className="relative" ref={containerRef}>
            {label && <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{label}</label>}
            <div className="relative">
                <input 
                    type="text" disabled={disabled}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 pr-8 outline-none focus:border-blue-500 text-sm dark:text-white disabled:bg-slate-100 h-9" 
                    value={query} 
                    onFocus={() => !disabled && setIsOpen(true)}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }} 
                    placeholder={placeholder} autoComplete="off"
                />
                <div className="absolute right-2 top-2 text-slate-400">
                    {value && !disabled ? 
                        <button onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}><X size={14}/></button> :
                        <ChevronDown size={14} className={isOpen ? 'rotate-180' : ''}/>
                    }
                </div>
            </div>
            {isOpen && !disabled && (
                <ul className="absolute z-[150] w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-auto mt-1 text-sm">
                    {filtered.length > 0 ? filtered.map(opt => (
                        <li key={opt.id} onMouseDown={() => { onChange(opt.id); setQuery(opt.label); setIsOpen(false); }} className={`p-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 flex justify-between items-center ${String(value) === String(opt.id) ? 'text-blue-600 font-bold' : ''}`}>
                            <div className="flex items-center gap-2 truncate">
                                {opt.prioridade && PRIORIDADES[opt.prioridade] && <span className={PRIORIDADES[opt.prioridade].color.split(' ')[1] + " p-0.5 rounded"}>{PRIORIDADES[opt.prioridade].icon}</span>}
                                {opt.label}
                            </div>
                        </li>
                    )) : <li className="p-2 text-slate-400 text-center">Nada encontrado.</li>}
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
    nome: '', nome_mae: '', sexo: '', cpf: '', data_nascimento: '', telefone: '', 
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

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    if (api) {
        api.get('configuracoes/sistema/').then(res => setConfigSistema(res.data)).catch(() => {});
        api.get('profissionais/').then(res => {
            const data = res.data.results || res.data;
            setProfissionais(Array.isArray(data) ? data.map(p => ({ id: p.id, label: p.nome })) : []);
        }).catch(() => {});
        api.get('pacientes/lista/').then(res => {
            const data = res.data.results || res.data;
            setPacientes(Array.isArray(data) ? data.map(p => ({ id: p.id, label: `${p.nome} - ${p.cpf}`, prioridade: p.prioridade })) : []);
        }).catch(() => {});
        api.get('configuracoes/convenios/').then(res => {
            const data = res.data.results || res.data;
            setConvenios(Array.isArray(data) ? data.map(c => ({ id: c.id, label: c.nome })) : []);
        }).catch(() => {});
        api.get('agendamento/bloqueios/').then(res => setListaBloqueios(res.data.results || res.data)).catch(() => {});
    }
  }, [api]);

  // --- CARREGA ESPECIALIDADES E REGRAS ---
  useEffect(() => {
    if (profissionalId) {
        api.get(`profissionais/${profissionalId}/`).then(res => {
            if (res.data && Array.isArray(res.data.especialidades)) {
                const specs = res.data.especialidades.map(v => ({ id: v.especialidade_leitura || v.especialidade_id, label: v.nome_especialidade }));
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
  }, [profissionalId, especialidadeId, dataApi, regrasProfissional]);

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
    const diaMes = dataIso.slice(5);
    const bloqueio = listaBloqueios.find(b => {
        const bateData = (b.data_inicio <= dataIso && b.data_fim >= dataIso);
        const bateRecorrente = b.recorrente && (b.data_inicio.slice(5) === diaMes);
        const bateProf = !b.profissional || (profissionalId && b.profissional === parseInt(profissionalId));
        return (bateData || bateRecorrente) && bateProf;
    });
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
    const diaMes = dataIso.slice(5);
    const bloqueioAtivo = listaBloqueios.find(b => {
        const bateData = (b.data_inicio <= dataIso && b.data_fim >= dataIso);
        const bateRecorrente = b.recorrente && (b.data_inicio.slice(5) === diaMes);
        const bateProf = !b.profissional || (profissionalId && b.profissional === parseInt(profissionalId));
        return (bateData || bateRecorrente) && bateProf;
    });

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

  // --- FUNÇÕES DE CADASTRO DE PACIENTE ---
  const handlePacienteChange = (e) => { 
      let { name, value } = e.target; 
      if (name === 'cpf') value = value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
      setNovoPaciente({ ...novoPaciente, [name]: value }); 
  };

  const buscarCep = async () => {
    const cepLimpo = novoPaciente.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) setNovoPaciente(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, city: data.localidade, estado: data.uf }));
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

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-blue-500 text-sm dark:text-white transition-all font-bold";

  return (
    <Layout>
      <style>{calendarStyles}</style>
      <div className="max-w-6xl mx-auto pb-10 px-4">
        
        {/* CABEÇALHO COMPACTO */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchableSelect label="MÉDICO" options={profissionais} value={profissionalId} onChange={setProfissionalId} placeholder="Selecione..." />
                <SearchableSelect label="ESPECIALIDADE" options={especialidades} value={especialidadeId} onChange={setEspecialidadeId} placeholder="Selecione..." disabled={!profissionalId} />
            </div>
        </div>

        {!profissionalId ? (
            <div className="bg-slate-100 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 py-12 text-center">
                <span className="text-sm font-bold text-slate-400 uppercase">Selecione um profissional para carregar a agenda</span>
            </div>
        ) : (
            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-200px)]">
                {/* CALENDÁRIO LATERAL (FIXO E ESTREITO) */}
                <div className="w-full md:w-64 shrink-0 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <Calendar onChange={(d) => { setDateValue(d); setDataApi(getLocalISODate(d)); }} value={dateValue} locale="pt-BR" tileClassName={getTileClassName}/>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Legenda</h4>
                        <div className="space-y-2 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-green-200 border border-green-400"></div><span>Livre</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-orange-200 border border-orange-400"></div><span>Bloqueio</span></div>
                            <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded bg-red-200 border border-red-400"></div><span>Cheio</span></div>
                        </div>
                    </div>
                </div>

                {/* LISTA DE VAGAS (EXPANDIDA E COMPACTA) */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                    <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-lg dark:text-white uppercase text-slate-700">{dateValue.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h3>
                        <button onClick={() => { setTipoModal('encaixe'); setAgendamentoIdEditar(null); setPacienteId(''); setConvenioId(''); setValorSelecionado(''); setModalOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-1.5 px-4 rounded-lg text-xs uppercase flex items-center gap-1 shadow-sm"><Plus size={14}/> Encaixe</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4">
                        {loadingAgenda ? (
                            <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={32}/></div>
                        ) : vagasDoDia.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
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
                                        className={`relative group p-2.5 rounded-xl border flex gap-3 items-center transition-all ${
                                            slot.ocupado ? 'bg-white border-blue-200 dark:bg-slate-900 dark:border-slate-700' : 
                                            isLocked || isExpirado ? 'bg-slate-100 opacity-50 cursor-not-allowed border-slate-200' : 
                                            'bg-white border-green-200 hover:border-green-500 hover:shadow-md cursor-pointer'
                                        }`}>
                                            <div className={`font-black text-sm w-12 h-9 flex items-center justify-center rounded-lg ${slot.ocupado ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700'}`}>{slot.hora}</div>
                                            
                                            <div className="flex-1 min-w-0">
                                                {slot.ocupado ? (
                                                    <div className="flex flex-col">
                                                        <div className="font-bold text-xs text-slate-800 dark:text-white truncate uppercase" title={slot.paciente}>{slot.paciente}</div>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 rounded">{slot.convenio_nome || 'PARTICULAR'}</span>
                                                            {pInfo && <span className={`${pInfo.color} p-0.5 rounded`} title={pInfo.label}>{pInfo.icon}</span>}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className={`text-[10px] font-bold uppercase ${isLocked ? 'text-slate-400' : 'text-green-600'}`}>
                                                        {isLocked ? 'Trancada' : isExpirado ? 'Expirado' : 'Disponível'}
                                                    </span>
                                                )}
                                            </div>

                                            {/* AÇÕES AO PASSAR MOUSE (APENAS SE OCUPADO) */}
                                            {slot.ocupado && (
                                                <div className="absolute right-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-lg p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm border border-slate-200 dark:border-slate-700">
                                                    <button onClick={(e) => { e.stopPropagation(); generateAppointmentReceipt(slot); }} className="p-1 hover:bg-slate-100 rounded text-slate-500"><Printer size={12}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setAgendamentoIdEditar(slot.agendamento_id); setHorarioSelecionado(slot.hora); setPacienteId(slot.paciente_id); setConvenioId(slot.convenio_id || ''); setObservacao(slot.observacoes || ''); setValorSelecionado(slot.valor); setModalOpen(true); }} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Pencil size={12}/></button>
                                                    <button onClick={(e) => handleExcluirAgendamento(e, slot.agendamento_id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 size={12}/></button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-60">
                                <CalendarIcon size={48} className="mb-2"/>
                                <span className="font-bold uppercase tracking-widest text-xs">Agenda Vazia</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL DE AGENDAMENTO */}
        {modalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in zoom-in-95 duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b dark:border-slate-700 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 dark:text-white uppercase">{agendamentoIdEditar ? 'Editar' : 'Confirmar'} Agendamento</h3>
                        <button onClick={() => setModalOpen(false)}><X size={20} className="text-slate-400 hover:text-slate-600"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex justify-between items-center text-blue-800 dark:text-blue-300 font-bold text-sm">
                            <span className="flex items-center gap-2"><Clock size={16}/> {horarioSelecionado || encaixeHora}</span>
                            <span>{dateValue.toLocaleDateString()}</span>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-xs font-bold text-slate-500 uppercase">Paciente</label>
                                <button onClick={() => setModalPacienteOpen(true)} className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:underline"><Plus size={12}/> Novo</button>
                            </div>
                            <SearchableSelect options={pacientes} value={pacienteId} onChange={setPacienteId} placeholder="Nome ou CPF..." />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <SearchableSelect label="Convênio" options={convenios} value={convenioId} onChange={setConvenioId} placeholder="Particular" />
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor (R$)</label>
                                <input type="number" className={inputClass} value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)} />
                            </div>
                        </div>

                        {tipoModal === 'encaixe' && (
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora Encaixe</label><input type="time" className={inputClass} value={encaixeHora} onChange={e => setEncaixeHora(e.target.value)} /></div>
                        )}

                        <textarea placeholder="Observações..." className={`${inputClass} h-20 resize-none`} value={observacao} onChange={e => setObservacao(e.target.value)}></textarea>

                        {/* CHECKBOX WHATSAPP RESTAURADO */}
                        <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input 
                                type="checkbox" 
                                id="wpp_check" 
                                checked={enviarWhatsapp} 
                                onChange={e => setEnviarWhatsapp(e.target.checked)}
                                disabled={!configSistema?.enviar_whatsapp_global}
                                className="rounded text-green-600 focus:ring-green-500"
                            />
                            <label htmlFor="wpp_check" className="text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                                <MessageCircle size={14} className={enviarWhatsapp ? 'text-green-500' : 'text-slate-400'}/>
                                Enviar confirmação automática via WhatsApp
                            </label>
                        </div>

                        <button onClick={salvarAgendamento} disabled={loadingSave} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold uppercase text-xs shadow-lg flex items-center justify-center gap-2">
                            {loadingSave ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Confirmar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL PACIENTE (Mantido funcional, só visualmente adaptado) */}
        {modalPacienteOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white uppercase flex items-center gap-2"><UserPlus size={20}/> Cadastro Rápido</h3>
                        <button onClick={() => setModalPacienteOpen(false)}><X/></button>
                    </div>
                    <form onSubmit={salvarPacienteCompleto} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2"><label className="text-xs font-bold block mb-1">Nome</label><input name="nome" value={novoPaciente.nome} onChange={handlePacienteChange} className={inputClass} required/></div>
                        <div><label className="text-xs font-bold block mb-1">CPF</label><input name="cpf" value={novoPaciente.cpf} onChange={handlePacienteChange} className={inputClass} required/></div>
                        <div><label className="text-xs font-bold block mb-1">Nascimento</label><input type="date" name="data_nascimento" value={novoPaciente.data_nascimento} onChange={handlePacienteChange} className={inputClass} required max={hojeIso}/></div>
                        <div><label className="text-xs font-bold block mb-1">Celular</label><input name="telefone" value={novoPaciente.telefone} onChange={handlePacienteChange} className={inputClass}/></div>
                        <div>
                            <label className="text-xs font-bold block mb-1">Prioridade</label>
                            <select name="prioridade" value={novoPaciente.prioridade} onChange={handlePacienteChange} className={inputClass}>
                                <option value="">Nenhuma</option>{Object.entries(PRIORIDADES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3 pt-4 border-t flex justify-end gap-2">
                            <button type="button" onClick={() => setModalPacienteOpen(false)} className="px-4 py-2 rounded-lg bg-slate-100 font-bold text-xs text-slate-600">Cancelar</button>
                            <button type="submit" disabled={loadingPaciente} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs">{loadingPaciente ? 'Salvando...' : 'Cadastrar'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}

import { Clock, Plus as PlusIcon } from 'lucide-react'; // Imports extras necessários