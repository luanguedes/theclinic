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
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
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
                <ul className="absolute z-[100] w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-auto mt-1 animate-in fade-in zoom-in-95 duration-100">
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

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all";

  return (
    <Layout>
      <style>{calendarStyles}</style>
      <div className="max-w-7xl mx-auto pb-20 tracking-tight">
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-3 rounded-2xl text-white shadow-xl shadow-blue-500/20"><CalendarIcon size={28}/></div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white uppercase tracking-tighter">Marcar Consulta</h1>
                <p className="text-slate-500 text-sm font-medium">Gestão de horários e atendimento.</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <SearchableSelect label="Profissional" options={profissionais} value={profissionalId} onChange={setProfissionalId} placeholder="Selecione o médico..." />
            <SearchableSelect label="Especialidade" options={especialidades} value={especialidadeId} onChange={setEspecialidadeId} placeholder="Área de atendimento..." disabled={!profissionalId} />
        </div>

        {!profissionalId ? (
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border-2 border-dashed border-slate-200 dark:border-slate-800 py-24 text-center">
                <CalendarIcon size={64} className="mx-auto text-slate-300 mb-4 opacity-40"/>
                <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Selecione um Profissional</h2>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <Calendar onChange={(d) => { setDateValue(d); setDataApi(getLocalISODate(d)); }} value={dateValue} locale="pt-BR" tileClassName={getTileClassName}/>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Legenda do Calendário</h4>
                        <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-200 border border-green-300"></div><span>Vagas Livres</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-200 border border-orange-300"></div><span>Bloqueado</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-200 border border-purple-300"></div><span>Feriado</span></div>
                            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-200 border border-red-300"></div><span>Sem Vagas</span></div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col min-h-[600px] overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50/50 dark:bg-slate-700/30 dark:border-slate-700">
                        <h3 className="font-black text-xl dark:text-white uppercase tracking-tight">{dateValue.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                        <button onClick={() => { setTipoModal('encaixe'); setAgendamentoIdEditar(null); setValorSelecionado(''); setModalOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-white font-black py-2.5 px-6 rounded-xl text-[10px] uppercase flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-amber-200 dark:shadow-none"><Plus size={16}/> Encaixe Extra</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {loadingAgenda ? (
                            <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></div>
                        ) : vagasDoDia.length > 0 ? (
                            vagasDoDia.map((slot, idx) => {
                                const isPast = isDateInPast(dateValue);
                                const isExpirado = isPast || (dateValue.toDateString() === new Date().toDateString() && slot.hora < new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}));
                                const isLocked = slot.agenda_fechada && !slot.ocupado; 
                                const pInfo = slot.prioridade ? PRIORIDADES[slot.prioridade] : null;

                                return (
                                    <div key={idx} onClick={() => { if (!slot.ocupado && !isLocked && !isExpirado) { setAgendamentoIdEditar(null); setHorarioSelecionado(slot.hora); setValorSelecionado(slot.valor); setTipoModal('normal'); setModalOpen(true); } else if (isExpirado && !slot.ocupado) { notify.warning("Horário expirado."); } }} 
                                         className={`group relative p-4 rounded-2xl border-2 flex justify-between items-center transition-all ${
                                            slot.is_encaixe ? 'bg-amber-50/50 border-amber-200' : 
                                            slot.ocupado ? 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700' : 
                                            isLocked || isExpirado ? 'bg-slate-100 opacity-50 cursor-not-allowed border-slate-200' : 
                                            'bg-white dark:bg-slate-800 border-green-100 hover:border-green-500 cursor-pointer hover:shadow-xl'
                                         }`}>
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className={`text-lg font-black w-14 h-10 flex items-center justify-center rounded-lg shadow-inner shrink-0 ${slot.is_encaixe ? 'bg-amber-100 text-amber-700' : slot.ocupado ? 'bg-slate-200 text-slate-500' : 'bg-blue-50 text-blue-600'}`}>{slot.hora}</div>
                                            <div className="flex-1 min-w-0">
                                                {slot.ocupado ? (
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            {pInfo && <span className={pInfo.color} title={pInfo.label}>{pInfo.icon}</span>}
                                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate uppercase">{slot.paciente}</div>
                                                        </div>
                                                        {slot.convenio_nome && <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mt-0.5">{slot.convenio_nome}</div>}
                                                    </div>
                                                ) : (
                                                    <div className={`text-[10px] font-black uppercase tracking-widest ${isLocked ? 'text-slate-400' : isExpirado ? 'text-slate-300' : 'text-green-500'}`}>
                                                        {isLocked ? 'Trancada' : isExpirado ? 'Expirado' : 'Livre'}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {slot.ocupado && (
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <button onClick={(e) => { e.stopPropagation(); generateAppointmentReceipt(slot); }} className="p-1.5 bg-white border rounded-lg shadow-sm text-slate-500 hover:bg-slate-50"><Printer size={14}/></button>
                                                <button onClick={(e) => { e.stopPropagation(); setAgendamentoIdEditar(slot.agendamento_id); setHorarioSelecionado(slot.hora); setPacienteId(slot.paciente_id); setConvenioId(slot.convenio_id || ''); setObservacao(slot.observacoes || ''); setValorSelecionado(slot.valor); setModalOpen(true); }} className="p-1.5 bg-white border rounded-lg shadow-sm text-blue-600 hover:bg-blue-50"><Pencil size={14}/></button>
                                                <button onClick={(e) => handleExcluirAgendamento(e, slot.agendamento_id)} className="p-1.5 bg-white border rounded-lg shadow-sm text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>
                                            </div>
                                        )}
                                        {slot.is_encaixe && !slot.ocupado && <div className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">EXTRA</div>}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-20 text-center text-slate-300 font-bold uppercase tracking-widest opacity-40">Sem horários para hoje</div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10">
                    <div className="bg-blue-600 p-8 text-white flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight uppercase">{agendamentoIdEditar ? 'Editar' : 'Novo'} Agendamento</h2>
                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest opacity-80">{horarioSelecionado || encaixeHora} • {dateValue.toLocaleDateString()}</p>
                        </div>
                        <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={28}/></button>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paciente</label>
                                <button onClick={() => setModalPacienteOpen(true)} className="text-[10px] text-blue-600 font-black uppercase flex items-center gap-1 hover:underline"><UserPlus size={12}/> Novo Cadastro</button>
                            </div>
                            <SearchableSelect label="" options={pacientes} value={pacienteId} onChange={setPacienteId} placeholder="Busque por Nome ou CPF..." />
                            {pacienteId && pacientes.find(p => p.id === pacienteId)?.prioridade && (
                                <div className={`mt-2 flex items-center gap-2 p-2 rounded-xl border ${PRIORIDADES[pacientes.find(p => p.id === pacienteId).prioridade].color} border-current opacity-70`}>
                                    {PRIORIDADES[pacientes.find(p => p.id === pacienteId).prioridade].icon}
                                    <span className="text-[10px] font-black uppercase tracking-widest">Paciente com Prioridade: {PRIORIDADES[pacientes.find(p => p.id === pacienteId).prioridade].label}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <SearchableSelect label="Convênio" options={convenios} value={convenioId} onChange={setConvenioId} placeholder="Particular" disabled={convenioTravado} />
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Valor Final</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">R$</span>
                                    <input type="number" step="0.01" className={`${inputClass} pl-9 font-bold text-blue-600`} value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)}/>
                                </div>
                            </div>
                        </div>

                        {tipoModal === 'encaixe' && (
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Horário do Encaixe</label>
                                <input type="time" className={inputClass} value={encaixeHora} onChange={e => setEncaixeHora(e.target.value)} />
                            </div>
                        )}

                        <textarea placeholder="Observações do agendamento..." className={`${inputClass} h-24 resize-none`} value={observacao} onChange={e => setObservacao(e.target.value)}></textarea>

                        <div className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${isWhatsappDisabled() ? 'bg-slate-50 opacity-60' : 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800'}`}>
                            <input type="checkbox" id="wpp" checked={enviarWhatsapp} disabled={isWhatsappDisabled()} onChange={e => setEnviarWhatsapp(e.target.checked)} className="w-5 h-5 rounded text-blue-600 border-blue-200 cursor-pointer disabled:cursor-not-allowed"/>
                            <label htmlFor="wpp" className={`text-xs font-bold uppercase tracking-tight flex items-center gap-2 ${isWhatsappDisabled() ? 'text-slate-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                <MessageCircle size={16} className={isWhatsappDisabled() ? 'text-slate-300' : 'text-green-500'}/>
                                {isWhatsappDisabled() ? 'Notificações Desativadas' : 'Enviar confirmação via WhatsApp'}
                            </label>
                        </div>

                        <button onClick={salvarAgendamento} disabled={loadingSave} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-3">
                            {loadingSave ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Confirmar Consulta
                        </button>
                    </div>
                </div>
            </div>
        )}

        {modalPacienteOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl my-10 overflow-hidden">
                    <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2"><UserPlus size={18} className="text-blue-400"/> Cadastro Expresso</h3>
                        <button onClick={() => setModalPacienteOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24}/></button>
                    </div>
                    <form onSubmit={salvarPacienteCompleto} className="p-8 grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div className="md:col-span-12 border-b dark:border-slate-700 pb-2 text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 tracking-widest"><User size={14}/> Dados Pessoais</div>
                        <div className="md:col-span-6"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Nome Completo</label><input name="nome" required value={novoPaciente.nome} onChange={handlePacienteChange} className={inputClass} /></div>
                        <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">CPF</label><input name="cpf" required value={novoPaciente.cpf} onChange={handlePacienteChange} className={inputClass} placeholder="000.000.000-00"/></div>
                        <div className="md:col-span-3">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Prioridade / PCD</label>
                            <select name="prioridade" value={novoPaciente.prioridade} onChange={handlePacienteChange} className={inputClass}>
                                <option value="">Nenhuma</option>
                                <option value="idoso">Idoso (60+)</option>
                                <option value="gestante">Gestante</option>
                                <option value="cadeirante">Cadeirante</option>
                                <option value="autista">Autismo (TEA)</option>
                                <option value="pcd">PCD / Def. Oculta</option>
                            </select>
                        </div>
                        <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Nascimento</label><input type="date" name="data_nascimento" required max={hojeIso} value={novoPaciente.data_nascimento} onChange={handlePacienteChange} className={inputClass} /></div>
                        <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Telefone</label><input name="telefone" value={novoPaciente.telefone} onChange={handlePacienteChange} className={inputClass} placeholder="(00) 00000-0000"/></div>
                        <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Sexo</label><select name="sexo" value={novoPaciente.sexo} onChange={handlePacienteChange} className={inputClass}><option value="">Selecione...</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Outro">Outro</option></select></div>
                        <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Nome da Mãe</label><input name="nome_mae" value={novoPaciente.nome_mae} onChange={handlePacienteChange} className={inputClass} /></div>
                        
                        <div className="md:col-span-12 border-b dark:border-slate-700 pb-2 mt-4 text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 tracking-widest"><MapPin size={14}/> Endereço</div>
                        <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">CEP</label><input name="cep" value={novoPaciente.cep} onChange={handlePacienteChange} onBlur={buscarCep} className={inputClass} placeholder="00000-000"/></div>
                        <div className="md:col-span-7"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Logradouro</label><input name="logradouro" value={novoPaciente.logradouro} onChange={handlePacienteChange} className={inputClass} /></div>
                        <div className="md:col-span-2"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Nº</label><input id="numero_paciente_modal" name="numero" value={novoPaciente.numero} onChange={handlePacienteChange} className={inputClass} /></div>
                        <div className="md:col-span-4"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Complemento</label><input name="complemento" value={novoPaciente.complemento} onChange={handlePacienteChange} className={inputClass} placeholder="Apto, Bloco..."/></div>
                        <div className="md:col-span-4"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Bairro</label><input name="bairro" value={novoPaciente.bairro} onChange={handlePacienteChange} className={inputClass} /></div>
                        <div className="md:col-span-3"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">Cidade</label><input name="city" value={novoPaciente.city} onChange={handlePacienteChange} className={inputClass} /></div>
                        <div className="md:col-span-1"><label className="text-[10px] font-bold text-slate-500 uppercase ml-1 block mb-1">UF</label><input name="estado" value={novoPaciente.estado} onChange={handlePacienteChange} className={inputClass} maxLength={2} style={{textTransform:'uppercase'}}/></div>
                        
                        <div className="md:col-span-12 pt-8 flex gap-4 justify-end">
                            <button type="button" onClick={() => setModalPacienteOpen(false)} className="px-8 py-3 text-slate-500 font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 rounded-xl transition-colors">Cancelar</button>
                            <button type="submit" disabled={loadingPaciente} className="px-10 py-3 bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                                {loadingPaciente ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} Salvar e Usar
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