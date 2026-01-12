import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
    Calendar as CalendarIcon, X, Plus, Trash2, Pencil, Loader2, Save, UserPlus, MapPin, ChevronDown, Check, AlertCircle, DollarSign, Printer, ShieldCheck, Lock, MessageCircle, User, Baby, Heart, Accessibility, Users
} from 'lucide-react';
import { generateAppointmentReceipt } from '../utils/generateReceipt';

const calendarStyles = `
  .react-calendar { width: 100%; border: none; font-family: inherit; background: transparent; }
  .react-calendar__tile--now { background: transparent !important; color: #2563eb !important; border: 2px solid #2563eb !important; }
  .dia-livre { background-color: #dcfce7 !important; color: #166534 !important; border: 1px solid #bbf7d0 !important; font-weight: bold; }
  .dia-feriado { background-color: #f3e8ff !important; color: #6b21a8 !important; border: 1px solid #d8b4fe !important; cursor: not-allowed !important; opacity: 0.9; font-weight: bold; }
  .dia-bloqueado { background-color: #ffedd5 !important; color: #c2410c !important; border: 1px solid #fed7aa !important; cursor: not-allowed !important; text-decoration: line-through; }
  .dia-sem-vagas { background-color: #fee2e2 !important; color: #b91c1c !important; border: 1px solid #fecaca !important; cursor: not-allowed !important; opacity: 0.8; }
  .react-calendar__tile--active { background: #2563eb !important; color: white !important; border: none !important; }
  .react-calendar__tile:disabled { background-color: #f3f4f6 !important; color: #9ca3af !important; }
`;

const PRIORIDADES = {
    'idoso': { label: 'Idoso', icon: <Users size={12} />, color: 'text-amber-600 bg-amber-50' },
    'cadeirante': { label: 'Cadeirante', icon: <Accessibility size={12} />, color: 'text-blue-600 bg-blue-50' },
    'gestante': { label: 'Gestante', icon: <Baby size={12} />, color: 'text-pink-600 bg-pink-50' },
    'autista': { label: 'TEA', icon: <Heart size={12} />, color: 'text-teal-600 bg-teal-50' },
    'pcd': { label: 'PCD', icon: <Accessibility size={12} />, color: 'text-purple-600 bg-purple-50' },
};

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
        <div className="relative mb-4" ref={containerRef}>
            {label && <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{label}</label>}
            <div className="relative">
                <input 
                    type="text" disabled={disabled}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white disabled:opacity-50 disabled:bg-slate-200 cursor-pointer" 
                    value={query} 
                    onFocus={() => !disabled && setIsOpen(true)}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }} 
                    placeholder={placeholder} autoComplete="off"
                />
                <div className="absolute right-2 top-2.5 flex items-center gap-1 text-slate-400">
                    {value && !disabled && (
                        <button onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }} className="hover:text-red-500 p-0.5 rounded-full hover:bg-slate-200 transition-colors"><X size={14}/></button>
                    )}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            {isOpen && !disabled && (
                <ul className="absolute z-[150] w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-auto mt-1 animate-in fade-in zoom-in-95 duration-100">
                    {filtered.length > 0 ? filtered.map(opt => (
                        <li key={opt.id} onMouseDown={() => { onChange(opt.id); setQuery(opt.label); setIsOpen(false); }} className={`p-2.5 cursor-pointer text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 flex justify-between items-center hover:bg-blue-50 dark:hover:bg-blue-900/20 ${String(value) === String(opt.id) ? 'text-blue-700 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                            <div className="flex items-center gap-2">
                                {opt.prioridade && PRIORIDADES[opt.prioridade] && <span className={PRIORIDADES[opt.prioridade].color}>{PRIORIDADES[opt.prioridade].icon}</span>}
                                {opt.label}
                            </div>
                            {String(value) === String(opt.id) && <Check size={14}/>}
                        </li>
                    )) : <li className="p-3 text-sm text-slate-400 text-center">Nenhum resultado.</li>}
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
  const [convenioTravado, setConvenioTravado] = useState(false);
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

  useEffect(() => {
    if (api) {
        api.get('configuracoes/sistema/').then(res => setConfigSistema(res.data)).catch(() => {});
        api.get('profissionais/').then(res => {
            const data = res.data.results || res.data;
            setProfissionais(Array.isArray(data) ? data.map(p => ({ id: p.id, label: p.nome })) : []);
        }).catch(() => setProfissionais([]));
        api.get('pacientes/lista/').then(res => {
            const data = res.data.results || res.data;
            setPacientes(Array.isArray(data) ? data.map(p => ({ id: p.id, label: `${p.nome} - ${p.cpf}`, prioridade: p.prioridade })) : []);
        }).catch(() => setPacientes([]));
        api.get('configuracoes/convenios/').then(res => {
            const data = res.data.results || res.data;
            setConvenios(Array.isArray(data) ? data.map(c => ({ id: c.id, label: c.nome })) : []);
        }).catch(() => setConvenios([]));
        api.get('agendamento/bloqueios/').then(res => {
            const data = res.data.results || res.data;
            setListaBloqueios(Array.isArray(data) ? data : []);
        }).catch(() => setListaBloqueios([]));
    }
  }, [api]);

  useEffect(() => {
    if (profissionalId) {
        api.get(`profissionais/${profissionalId}/`).then(res => {
            if (res.data && Array.isArray(res.data.especialidades)) {
                const specs = res.data.especialidades.map(v => ({ id: v.especialidade_leitura || v.especialidade_id, label: v.nome_especialidade }));
                setEspecialidades(specs);
                if(specs.length === 1) setEspecialidadeId(specs[0].id);
                else setEspecialidadeId('');
            }
        }).catch(() => setEspecialidades([]));
        
        api.get(`agendas/config/?status=todos&profissional_id=${profissionalId}&nopage=true`)
            .then(res => setRegrasProfissional(Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : []))
            .catch(() => setRegrasProfissional([]));
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

  const isWhatsappDisabled = () => !configSistema?.enviar_whatsapp_global || !configSistema?.enviar_wpp_confirmacao;

  const salvarAgendamento = async () => {
    if (!pacienteId) return notify.warning("Por favor, selecione um paciente.");
    setLoadingSave(true);
    const hora = tipoModal === 'encaixe' ? encaixeHora : horarioSelecionado;
    try {
        const payload = { profissional: profissionalId, especialidade: especialidadeId, paciente: pacienteId, data: dataApi, horario: hora, convenio: convenioId || null, valor: valorSelecionado, observacoes: observacao, is_encaixe: tipoModal === 'encaixe', enviar_whatsapp: enviarWhatsapp };
        if(agendamentoIdEditar) {
            await api.put(`agendamento/${agendamentoIdEditar}/`, payload);
            notify.success("Agendamento atualizado!");
        } else {
            const { data } = await api.post('agendamento/', payload);
            notify.success("Agendamento realizado com sucesso!");
            generateAppointmentReceipt(data);
        }
        setModalOpen(false);
        carregarAgenda();
    } catch (e) { notify.error("Erro ao salvar agendamento."); }
    finally { setLoadingSave(false); }
  };

  const handleExcluirAgendamento = async (e, id) => {
      e.stopPropagation();
      const confirmado = await confirmDialog("Deseja realmente excluir este agendamento?", "Excluir Agendamento", "Confirmar Exclusão", "Voltar", "danger");
      if (confirmado) {
          try {
              await api.delete(`agendamento/${id}/`);
              notify.success("Agendamento removido.");
              carregarAgenda();
          } catch (e) { notify.error("Erro ao excluir."); }
      }
  };

  const mascaraCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
  const mascaraTelefone = (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
  const mascaraCEP = (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);

  const handlePacienteChange = (e) => { 
      let { name, value } = e.target; 
      if (name === 'data_nascimento') {
          const partes = value.split('-');
          if (partes[0] && partes[0].length > 4) return;
      }
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
      if (!data.erro) {
        setNovoPaciente(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, city: data.localidade, estado: data.uf }));
        document.getElementById('numero_paciente_modal')?.focus();
      } else { notify.warning("CEP não encontrado."); }
    } finally { setLoadingCep(false); }
  };

  const salvarPacienteCompleto = async (e) => {
      e.preventDefault();
      if (novoPaciente.data_nascimento > hojeIso) return notify.warning("Data de nascimento não pode ser futura.");
      setLoadingPaciente(true); 
      try {
          const payload = { ...novoPaciente, cpf: novoPaciente.cpf.replace(/\D/g, '') };
          const { data } = await api.post('pacientes/', payload);
          notify.success("Paciente cadastrado com sucesso!");
          setPacientes(prev => [{ id: data.id, label: `${data.nome} - ${data.cpf}`, prioridade: data.prioridade }, ...prev]);
          setModalPacienteOpen(false);
          setPacienteId(data.id);
      } catch (error) { 
          notify.error(error.response?.data?.cpf ? "Este CPF já existe no sistema." : "Erro ao cadastrar."); 
      } finally { setLoadingPaciente(false); }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold";

  return (
    <Layout>
      <style>{calendarStyles}</style>
      <div className="max-w-5xl mx-auto pb-20 tracking-tight px-4"> {/* Ajustado de 7xl para 5xl para centralizar e não esticar */}
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-500/20"><CalendarIcon size={28}/></div>
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none">Marcar Consulta</h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gestão de horários e atendimento</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <SearchableSelect label="Médico / Profissional" options={profissionais} value={profissionalId} onChange={setProfissionalId} placeholder="Busque o nome do médico..." />
            <SearchableSelect label="Especialidade" options={especialidades} value={especialidadeId} onChange={setEspecialidadeId} placeholder="Selecione a área..." disabled={!profissionalId} />
        </div>

        {!profissionalId ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 py-32 text-center">
                <CalendarIcon size={64} className="mx-auto text-slate-200 mb-4 opacity-40"/>
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">Selecione um Profissional para começar</h2>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-lg border border-slate-200 dark:border-slate-700">
                        <Calendar onChange={(d) => { setDateValue(d); setDataApi(getLocalISODate(d)); }} value={dateValue} locale="pt-BR" tileClassName={getTileClassName}/>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-[32px] border border-slate-200 dark:border-slate-700">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Status da Agenda</h4>
                        <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-tighter">
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-green-400"></div><span>Disponível</span></div>
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div><span>Bloqueado</span></div>
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div><span>Feriado</span></div>
                            <div className="flex items-center gap-2 px-2 py-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><div className="w-2.5 h-2.5 rounded-full bg-red-400"></div><span>Completo</span></div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-[600px] overflow-hidden">
                    <div className="p-8 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-700">
                        <h3 className="font-black text-2xl dark:text-white uppercase tracking-tighter">{dateValue.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                        <button onClick={() => { 
                            setTipoModal('encaixe'); 
                            setAgendamentoIdEditar(null); 
                            setPacienteId('');
                            setConvenioId('');
                            setValorSelecionado(''); 
                            setModalOpen(true); 
                        }} className="bg-amber-500 hover:bg-amber-600 text-white font-black py-3 px-8 rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-amber-500/20"><Plus size={18} strokeWidth={3}/> Encaixe Extra</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {loadingAgenda ? (
                            <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={48}/></div>
                        ) : vagasDoDia.length > 0 ? (
                            vagasDoDia.map((slot, idx) => {
                                const isPast = isDateInPast(dateValue);
                                const isExpirado = isPast || (dateValue.toDateString() === new Date().toDateString() && slot.hora < new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}));
                                const isLocked = slot.agenda_fechada && !slot.ocupado; 
                                const pInfo = slot.prioridade ? PRIORIDADES[slot.prioridade] : null;

                                return (
                                    <div key={idx} onClick={() => { 
                                        if (!slot.ocupado && !isLocked && !isExpirado) { 
                                            setAgendamentoIdEditar(null); 
                                            setHorarioSelecionado(slot.hora); 
                                            setValorSelecionado(slot.valor); 
                                            // LOGICA DO CONVÊNIO: Traz o convênio da regra da agenda
                                            setConvenioId(slot.convenio_regra_id || '');
                                            setPacienteId('');
                                            setTipoModal('normal'); 
                                            setModalOpen(true); 
                                        } else if (isExpirado && !slot.ocupado) { 
                                            notify.warning("Horário expirado."); 
                                        } 
                                    }} 
                                         className={`group relative p-5 rounded-[24px] border-2 flex justify-between items-center transition-all duration-300 ${
                                            slot.is_encaixe ? 'bg-amber-50/30 border-amber-200' : 
                                            slot.ocupado ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700' : 
                                            isLocked || isExpirado ? 'bg-slate-50 opacity-40 cursor-not-allowed border-transparent' : 
                                            'bg-white dark:bg-slate-800 border-emerald-50 hover:border-emerald-500 cursor-pointer hover:shadow-xl hover:-translate-y-1'
                                         }`}>
                                        <div className="flex items-center gap-5 min-w-0">
                                            <div className={`text-xl font-black w-16 h-12 flex items-center justify-center rounded-2xl shadow-inner shrink-0 ${slot.is_encaixe ? 'bg-amber-100 text-amber-700' : slot.ocupado ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>{slot.hora}</div>
                                            <div className="flex-1 min-w-0">
                                                {slot.ocupado ? (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            {pInfo && <span className={`${pInfo.color} p-1 rounded-lg`} title={pInfo.label}>{pInfo.icon}</span>}
                                                            <div className="text-sm font-black text-slate-800 dark:text-slate-200 truncate uppercase tracking-tighter">{slot.paciente}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md">
                                                                {slot.convenio_nome || 'PARTICULAR'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className={`text-[11px] font-black uppercase tracking-[0.2em] ${isLocked ? 'text-slate-400' : isExpirado ? 'text-slate-300' : 'text-emerald-500'}`}>
                                                        {isLocked ? 'Trancada' : isExpirado ? 'Expirado' : 'Disponível'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {slot.ocupado && (
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); generateAppointmentReceipt(slot); }} className="p-2.5 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-xl shadow-md text-slate-500 hover:text-blue-600 transition-colors"><Printer size={16}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); setAgendamentoIdEditar(slot.agendamento_id); setHorarioSelecionado(slot.hora); setPacienteId(slot.paciente_id); setConvenioId(slot.convenio_id || ''); setObservacao(slot.observacoes || ''); setValorSelecionado(slot.valor); setModalOpen(true); }} className="p-2.5 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-xl shadow-md text-blue-600 hover:bg-blue-50 transition-colors"><Pencil size={16}/></button>
                                                <button onClick={(e) => handleExcluirAgendamento(e, slot.agendamento_id)} className="p-2.5 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-xl shadow-md text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={16}/></button>
                                            </div>
                                        )}
                                        {slot.is_encaixe && !slot.ocupado && <div className="absolute top-2 right-2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest">Extra</div>}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 text-center text-slate-300 font-bold uppercase tracking-widest opacity-40">Sem horários configurados</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* MODAL PRINCIPAL - AJUSTADO Z-INDEX E LOGICA CONVÊNIO */}
        {modalOpen && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 animate-in zoom-in-95 duration-300">
                    <div className="bg-blue-600 p-10 text-white relative">
                        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><CalendarIcon size={120}/></div>
                        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">{agendamentoIdEditar ? 'Editar' : 'Confirmar'} Consulta</h2>
                        <p className="text-blue-100 text-[11px] font-black uppercase tracking-[0.2em] mt-4 flex items-center gap-2">
                             <Clock size={14}/> {horarioSelecionado || encaixeHora} • {dateValue.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                        </p>
                        <button onClick={() => setModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28}/></button>
                    </div>
                    <div className="p-10 space-y-8">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Titular do Atendimento</label>
                                <button onClick={() => setModalPacienteOpen(true)} className="text-[10px] text-blue-600 font-black uppercase flex items-center gap-1 hover:underline active:scale-95 transition-all"><Plus size={12} strokeWidth={4}/> Criar Cadastro</button>
                            </div>
                            <SearchableSelect label="" options={pacientes} value={pacienteId} onChange={setPacienteId} placeholder="Digite nome ou CPF do paciente..." />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                            {/* CONVÊNIO TRAZIDO DA AGENDA */}
                            <SearchableSelect label="Plano / Convênio" options={convenios} value={convenioId} onChange={setConvenioId} placeholder="PARTICULAR" disabled={convenioTravado} />
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest ml-1">Valor Final</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-slate-400 font-black text-sm">R$</span>
                                    <input type="number" step="0.01" className={`${inputClass} pl-12 font-black text-lg text-blue-600 py-3.5`} value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)}/>
                                </div>
                            </div>
                        </div>

                        {tipoModal === 'encaixe' && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest ml-1">Definir Horário de Encaixe</label>
                                <input type="time" className={`${inputClass} py-3.5 text-lg font-black`} value={encaixeHora} onChange={e => setEncaixeHora(e.target.value)} />
                            </div>
                        )}

                        <textarea placeholder="Alguma observação importante para este atendimento?" className={`${inputClass} h-28 resize-none p-4 font-medium leading-relaxed border-2`} value={observacao} onChange={e => setObservacao(e.target.value)}></textarea>

                        <button onClick={salvarAgendamento} disabled={loadingSave || !pacienteId} className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale">
                            {loadingSave ? <Loader2 className="animate-spin"/> : <Save size={20}/>} {agendamentoIdEditar ? 'Salvar Alterações' : 'Finalizar Agendamento'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL CADASTRO EXPRESSO - AJUSTADO Z-INDEX */}
        {modalPacienteOpen && (
            <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl w-full max-w-4xl my-10 overflow-hidden border border-white/10">
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center border-b border-white/10">
                        <h3 className="font-black uppercase tracking-[0.2em] text-sm flex items-center gap-3"><UserPlus size={22} className="text-blue-500"/> Cadastro Expresso de Paciente</h3>
                        <button onClick={() => setModalPacienteOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={32}/></button>
                    </div>
                    <form onSubmit={salvarPacienteCompleto} className="p-10 grid grid-cols-1 md:grid-cols-12 gap-8">
                        <div className="md:col-span-12 border-b dark:border-slate-700 pb-3 mb-2 font-black text-slate-400 uppercase flex items-center gap-2 tracking-[0.2em] text-[10px]"><User size={16}/> Dados de Identificação</div>
                        <div className="md:col-span-6"><label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Nome do Titular</label><input name="nome" required value={novoPaciente.nome} onChange={handlePacienteChange} className={`${inputClass} py-3.5`} /></div>
                        <div className="md:col-span-3"><label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2 tracking-widest">CPF</label><input name="cpf" required value={novoPaciente.cpf} onChange={handlePacienteChange} className={`${inputClass} py-3.5`} placeholder="000.000.000-00"/></div>
                        <div className="md:col-span-3"><label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-2 tracking-widest">Prioridade / PCD</label><select name="prioridade" value={novoPaciente.prioridade} onChange={handlePacienteChange} className={`${inputClass} py-3.5`}>
                            <option value="">Nenhuma</option><option value="idoso">Idoso (60+)</option><option value="gestante">Gestante</option><option value="cadeirante">Cadeirante</option><option value="autista">Autismo (TEA)</option><option value="pcd">Def. Oculta</option>
                        </select></div>
                        
                        <div className="md:col-span-12 pt-10 flex gap-4 justify-end border-t dark:border-slate-700 mt-6">
                            <button type="button" onClick={() => setModalPacienteOpen(false)} className="px-10 py-4 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 rounded-[20px] transition-all">Cancelar</button>
                            <button type="submit" disabled={loadingPaciente} className="px-12 py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-[20px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-3 active:scale-95">
                                {loadingPaciente ? <Loader2 className="animate-spin" size={18}/> : <Check size={20} strokeWidth={4}/>} Validar e Usar Cadastro
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

// Subcomponentes extras para facilitar navegação
const ChevronLeft = () => <ChevronLeftIcon size={24} strokeWidth={3} />;
const ChevronRight = () => <ChevronRightIcon size={24} strokeWidth={3} />;
import { ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Clock } from 'lucide-react';