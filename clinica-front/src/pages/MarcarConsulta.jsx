import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
  Calendar as CalendarIcon, X, Plus, Trash2, Pencil, Loader2, Save, UserPlus, MapPin, ChevronDown, Check, AlertCircle, DollarSign, Printer, ShieldCheck 
} from 'lucide-react';
import { generateAppointmentReceipt } from '../utils/generateReceipt';

const calendarStyles = `
  .react-calendar { width: 100%; border: none; font-family: inherit; background: transparent; }
  .react-calendar__tile--now { background: transparent !important; color: #2563eb !important; border: 2px solid #2563eb !important; }
  .dia-livre { background-color: #dcfce7 !important; color: #166534 !important; border: 1px solid #bbf7d0 !important; font-weight: bold; }
  .react-calendar__tile--active { background: #2563eb !important; color: white !important; border: none !important; }
  .react-calendar__tile:disabled { background-color: #f3f4f6 !important; color: #9ca3af !important; }
`;

const SearchableSelect = ({ label, options, value, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);

    useEffect(() => { 
        const selected = options.find(o => String(o.id) === String(value)); 
        if (selected) setQuery(selected.label);
        else if (!value) setQuery('');
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                const selected = options.find(o => String(o.id) === String(value));
                setQuery(selected ? selected.label : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [containerRef, value, options]);

    const filtered = (query === '' || query === (options.find(o => String(o.id) === String(value))?.label)) 
        ? options 
        : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
    
    const handleSelect = (id, label) => {
        onChange(id);
        setQuery(label);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
        setIsOpen(false);
    };

    return (
        <div className="relative mb-4" ref={containerRef}>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <div className="relative">
                <input 
                    type="text" disabled={disabled}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white disabled:opacity-50 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed" 
                    value={query} 
                    onFocus={() => !disabled && setIsOpen(true)}
                    onClick={() => !disabled && setIsOpen(true)}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); }} 
                    placeholder={placeholder} autoComplete="off"
                />
                <div className="absolute right-2 top-2.5 flex items-center gap-1 text-slate-400">
                    {value && !disabled && (
                        <button onClick={handleClear} className="hover:text-red-500 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X size={14}/></button>
                    )}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            {isOpen && !disabled && (
                <ul className="absolute z-[100] w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-auto mt-1 animate-in fade-in zoom-in duration-100">
                    {filtered.length > 0 ? filtered.map(opt => (
                        <li key={opt.id} onMouseDown={() => handleSelect(opt.id, opt.label)} className={`p-2.5 cursor-pointer text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors ${String(value) === String(opt.id) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                            {opt.label}
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
  
  const [profissionalId, setProfissionalId] = useState('');
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [dateValue, setDateValue] = useState(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [tipoModal, setTipoModal] = useState(''); 
  const [horarioSelecionado, setHorarioSelecionado] = useState('');
  const [valorSelecionado, setValorSelecionado] = useState(''); 
  const [pacienteId, setPacienteId] = useState('');
  const [convenioId, setConvenioId] = useState('');
  const [convenioTravado, setConvenioTravado] = useState(false);
  
  const [encaixeHora, setEncaixeHora] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loadingSave, setLoadingSave] = useState(false);
  const [agendamentoIdEditar, setAgendamentoIdEditar] = useState(null); 

  const [modalPacienteOpen, setModalPacienteOpen] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingPaciente, setLoadingPaciente] = useState(false); // NOVO ESTADO DE LOADING
  
  const formInicialPaciente = { nome: '', nome_mae: '', sexo: '', cpf: '', data_nascimento: '', telefone: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' };
  const [novoPaciente, setNovoPaciente] = useState(formInicialPaciente);

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

  const [dataApi, setDataApi] = useState(getLocalISODate(new Date()));
  const [vagasDoDia, setVagasDoDia] = useState([]);
  const [regrasProfissional, setRegrasProfissional] = useState([]); 

  useEffect(() => {
    if (api) {
        api.get('profissionais/').then(res => setProfissionais(res.data.results?.map(p => ({ id: p.id, label: p.nome })) || []));
        api.get('pacientes/lista/').then(res => setPacientes(res.data.results?.map(p => ({ id: p.id, label: `${p.nome} - ${p.cpf}` })) || []));
        api.get('configuracoes/convenios/').then(res => setConvenios(res.data.results?.map(c => ({ id: c.id, label: c.nome })) || []));
    }
  }, [api]);

  useEffect(() => {
    if (profissionalId) {
        api.get(`profissionais/${profissionalId}/`).then(res => {
            const specs = res.data.especialidades.map(v => ({ id: v.especialidade_leitura || v.especialidade_id, label: v.nome_especialidade }));
            setEspecialidades(specs);
            if(specs.length === 1) setEspecialidadeId(specs[0].id);
            else setEspecialidadeId('');
        });
        
        api.get(`agendas/config/?status=ativos&profissional_id=${profissionalId}&nopage=true`)
            .then(res => setRegrasProfissional(res.data))
            .catch(e => console.error(e));
    } else {
        setEspecialidades([]);
        setEspecialidadeId('');
        setRegrasProfissional([]);
    }
  }, [profissionalId, api]);

  useEffect(() => {
    if (profissionalId && especialidadeId && dataApi) carregarAgenda();
    else setVagasDoDia([]);
  }, [profissionalId, especialidadeId, dataApi, regrasProfissional]);

  const carregarAgenda = async () => {
    try {
        const res = await api.get(`agendamento/?profissional=${profissionalId}&especialidade=${especialidadeId}&data=${dataApi}`);
        const agendamentos = res.data.results || res.data;
        gerarVisualizacao(regrasProfissional, agendamentos);
    } catch (e) { console.error(e); }
  };

  const getTileClassName = ({ date, view }) => {
    if (view !== 'month' || !especialidadeId) return null;
    const dataString = getLocalISODate(date);
    const jsDay = date.getDay();
    const temRegra = regrasProfissional.some(r => 
        (r.dia_semana === jsDay) && 
        String(r.especialidade) === String(especialidadeId) && 
        (r.data_inicio <= dataString && r.data_fim >= dataString)
    );
    return temRegra ? 'dia-livre' : null;
  };

  const gerarVisualizacao = (regras, agendamentos) => {
    let slots = [];
    const jsDay = dateValue.getDay(); 
    
    const regrasFiltradas = regras.filter(r => 
        r.dia_semana === jsDay && 
        r.data_inicio <= dataApi && 
        r.data_fim >= dataApi && 
        String(r.especialidade) === String(especialidadeId)
    );

    regrasFiltradas.forEach(regra => {
        const valorRegra = parseFloat(regra.valor || 0);
        const convenioRegraNome = regra.convenio_nome; 
        const convenioRegraId = regra.convenio;

        if (regra.tipo === 'fixo') {
            const qtd = regra.quantidade_atendimentos || 1;
            for (let i = 0; i < qtd; i++) {
                slots.push({ 
                    hora: regra.hora_inicio.slice(0,5), 
                    valor: valorRegra, 
                    ocupado: false, 
                    convenio_regra_nome: convenioRegraNome,
                    convenio_regra_id: convenioRegraId
                });
            }
        } else {
            let atual = parseInt(regra.hora_inicio.split(':')[0]) * 60 + parseInt(regra.hora_inicio.split(':')[1]);
            const fim = parseInt(regra.hora_fim.split(':')[0]) * 60 + parseInt(regra.hora_fim.split(':')[1]);
            while (atual < fim) {
                const h = Math.floor(atual/60).toString().padStart(2,'0');
                const m = (atual%60).toString().padStart(2,'0');
                const horaFormatada = `${h}:${m}`;
                const qtdVagas = regra.quantidade_atendimentos > 0 ? regra.quantidade_atendimentos : 1;
                for (let i = 0; i < qtdVagas; i++) {
                    slots.push({ 
                        hora: horaFormatada, 
                        valor: valorRegra, 
                        ocupado: false, 
                        convenio_regra_nome: convenioRegraNome,
                        convenio_regra_id: convenioRegraId
                    });
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
            return { 
                ...s, 
                ocupado: true, 
                paciente: a.nome_paciente, 
                agendamento_id: a.id, 
                paciente_id: a.paciente, 
                convenio_id: a.convenio, 
                convenio_nome: a.nome_convenio, 
                observacoes: a.observacoes,
                is_encaixe: a.is_encaixe,
                valor: parseFloat(a.valor || s.valor)
            };
        }
        return s;
    });
    
    rests.forEach(a => final.push({ 
        hora: a.horario.slice(0,5), 
        valor: parseFloat(a.valor || 0), 
        ocupado: true, 
        paciente: a.nome_paciente, 
        agendamento_id: a.id, 
        is_encaixe: true, 
        paciente_id: a.paciente,
        convenio_id: a.convenio,
        convenio_nome: a.nome_convenio,
        observacoes: a.observacoes
    }));
    
    setVagasDoDia(final.sort((a,b) => a.hora.localeCompare(b.hora)));
  };

  const abrirAgendar = (slot) => {
      setAgendamentoIdEditar(null);
      setHorarioSelecionado(slot.hora);
      setValorSelecionado(slot.valor);
      setTipoModal('normal');
      setPacienteId(''); 
      setObservacao('');
      
      if (slot.convenio_regra_id) {
          setConvenioId(slot.convenio_regra_id);
          setConvenioTravado(true);
      } else {
          setConvenioId('');
          setConvenioTravado(false);
      }
      
      setModalOpen(true);
  };

  const abrirEncaixe = () => {
     if(isDateInPast(dateValue)) {
         notify.warning("Não é possível criar encaixe em datas passadas.");
         return;
     }
     setAgendamentoIdEditar(null); 
     setTipoModal('encaixe'); 
     setValorSelecionado(''); 
     setConvenioId('');
     setConvenioTravado(false);
     setModalOpen(true); 
  };

  const abrirEditar = (slot) => {
      setAgendamentoIdEditar(slot.agendamento_id);
      setHorarioSelecionado(slot.hora);
      setValorSelecionado(slot.valor);
      setPacienteId(slot.paciente_id); 
      setConvenioId(slot.convenio_id || ''); 
      setObservacao(slot.observacoes || '');
      setTipoModal(slot.is_encaixe ? 'encaixe' : 'normal');
      if(slot.is_encaixe) setEncaixeHora(slot.hora);
      setConvenioTravado(false);
      setModalOpen(true);
  };

  const handleImprimir = async () => {
    if (!agendamentoIdEditar) return;
    try {
        const res = await api.get(`agendamento/${agendamentoIdEditar}/`);
        generateAppointmentReceipt(res.data);
    } catch (error) {
        notify.error("Erro ao gerar comprovante.");
    }
  };

  const handleImprimirSlot = async (e, id) => {
      e.stopPropagation();
      try {
          const res = await api.get(`agendamento/${id}/`);
          generateAppointmentReceipt(res.data);
      } catch (e) {
          notify.error("Erro ao gerar comprovante.");
      }
  };

  const salvarAgendamento = async () => {
    if (!pacienteId) return notify.error("Selecione um paciente.");
    setLoadingSave(true);
    const hora = tipoModal === 'encaixe' ? encaixeHora : horarioSelecionado;
    try {
        const payload = { 
            profissional: profissionalId, 
            especialidade: especialidadeId, 
            paciente: pacienteId, 
            data: dataApi, 
            horario: hora, 
            convenio: convenioId || null, 
            valor: valorSelecionado, 
            observacoes: observacao, 
            is_encaixe: tipoModal === 'encaixe' 
        };
        
        if(agendamentoIdEditar) {
            await api.put(`agendamento/${agendamentoIdEditar}/`, payload);
            notify.success("Agendamento atualizado!");
        } else {
            const { data } = await api.post('agendamento/', payload);
            notify.success("Agendamento criado!");
            generateAppointmentReceipt(data);
        }
        setModalOpen(false);
        carregarAgenda();
    } catch (e) { notify.error("Erro ao salvar: " + (e.response?.data?.detail || "Erro interno")); }
    finally { setLoadingSave(false); }
  };

  const handleExcluirAgendamento = async (e, id) => {
      e.stopPropagation();
      const confirmado = await confirmDialog("Excluir este agendamento?", "Exclusão", "Sim, excluir", "Cancelar", "danger");
      if (confirmado) {
          try {
              await api.delete(`agendamento/${id}/`);
              notify.success("Agendamento excluído.");
              carregarAgenda();
          } catch (e) { notify.error("Erro ao excluir agendamento."); }
      }
  };

  const mascaraCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
  const mascaraTelefone = (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
  const mascaraCEP = (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
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
          const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
          const data = await res.json();
          if(!data.erro) {
              setNovoPaciente(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
              document.getElementById('modal-numero')?.focus();
          }
      } finally { setLoadingCep(false); }
  };

  // --- FUNÇÃO CORRIGIDA: ATUALIZA LISTA DO BANCO ---
  const salvarPacienteCompleto = async (e) => {
      e.preventDefault();
      setLoadingPaciente(true); // Bloqueia botão
      try {
          // 1. Salva no banco
          const { data } = await api.post('pacientes/', novoPaciente);
          notify.success("Paciente cadastrado!");

          // 2. ESTRATÉGIA SEGURA: Recarrega a lista completa da API para garantir
          // Como a API ordena por -criado_em (mais recente primeiro), o novo paciente será o primeiro.
          const resLista = await api.get('pacientes/lista/');
          const listaAtualizada = resLista.data.results?.map(p => ({ 
              id: p.id, 
              label: `${p.nome} - ${p.cpf}` 
          })) || [];

          setPacientes(listaAtualizada);
          setPacienteId(data.id); // Seleciona o ID
          
          setModalPacienteOpen(false);
          setNovoPaciente(formInicialPaciente);

      } catch (error) { 
          if (error.response?.data?.cpf) notify.warning("Este CPF já está cadastrado!");
          else notify.error("Erro ao cadastrar paciente. Verifique os dados."); 
      } finally {
          setLoadingPaciente(false); // Libera botão
      }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white";

  return (
    <Layout>
      <style>{calendarStyles}</style>
      <div className="max-w-7xl mx-auto pb-20">
        <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-3 rounded-xl text-white shadow"><CalendarIcon size={28}/></div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Marcar Consulta</h1>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableSelect label="Profissional" options={profissionais} value={profissionalId} onChange={(id) => { setProfissionalId(id); }} placeholder="Médico..." />
            <SearchableSelect label="Especialidade" options={especialidades} value={especialidadeId} onChange={setEspecialidadeId} placeholder="Especialidade..." disabled={!profissionalId} />
        </div>

        {profissionalId && especialidadeId && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
                <div className="lg:col-span-4 bg-white dark:bg-slate-800 p-6 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                    <Calendar 
                        onChange={(d) => { setDateValue(d); setDataApi(getLocalISODate(d)); }} 
                        value={dateValue} 
                        locale="pt-BR" 
                        tileClassName={getTileClassName}
                    />
                    
                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Legenda do Calendário</h4>
                        <div className="flex flex-col gap-3 text-xs text-slate-600 dark:text-slate-300">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border" style={{backgroundColor: '#dcfce7', borderColor: '#bbf7d0'}}></div> 
                                <span>Dias com Vagas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded border" style={{backgroundColor: '#fee2e2', borderColor: '#fecaca'}}></div> 
                                <span>Sem Vagas (Indisponível)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700 flex flex-col h-[550px]">
                    <div className="p-5 border-b flex justify-between items-center dark:border-slate-700">
                        <h3 className="font-bold text-lg dark:text-white uppercase">{dateValue.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                        <button onClick={abrirEncaixe} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-sm transition-all"><Plus size={16}/> Encaixe</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3 content-start">
                        {vagasDoDia.length > 0 ? vagasDoDia.map((slot, idx) => {
                            const isPast = isDateInPast(dateValue);
                            return (
                                <div 
                                    key={idx} 
                                    onClick={() => {
                                        if (slot.ocupado) return; 
                                        if (isPast) {
                                            notify.warning("Não é possível agendar em datas passadas.");
                                            return;
                                        }
                                        abrirAgendar(slot);
                                    }} 
                                    className={`relative p-3 rounded-xl border-2 flex justify-between items-center transition-all duration-200 ${
                                        slot.is_encaixe ? 'bg-yellow-50 border-yellow-200 hover:border-yellow-400' : 
                                        slot.ocupado ? 'bg-slate-50 border-slate-200 opacity-90' : 
                                        isPast ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white border-green-200 hover:border-green-500 cursor-pointer hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`text-lg font-bold w-16 text-center py-1 rounded-lg ${slot.is_encaixe ? 'bg-yellow-100 text-yellow-700' : slot.ocupado ? 'bg-slate-200 text-slate-500' : 'bg-blue-100 text-blue-700'}`}>
                                            {slot.hora}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {slot.ocupado ? (
                                                <>
                                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-800 truncate">{slot.paciente}</div>
                                                    {slot.convenio_nome && <div className="text-xs text-slate-500 truncate">{slot.convenio_nome}</div>}
                                                    {slot.valor > 0 && <div className="text-xs font-semibold text-slate-600 mt-0.5">R$ {Number(slot.valor).toFixed(2)}</div>}
                                                </>
                                            ) : (
                                                <>
                                                    <div className={`text-sm font-bold ${isPast ? 'text-slate-400' : 'text-green-600'}`}>{isPast ? 'Expirado' : 'Livre'}</div>
                                                    {slot.convenio_regra_nome && (
                                                        <div className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1 truncate">
                                                            <ShieldCheck size={12}/> {slot.convenio_regra_nome}
                                                        </div>
                                                    )}
                                                    {slot.valor > 0 && <div className="text-xs font-semibold text-slate-500 mt-0.5">R$ {Number(slot.valor).toFixed(2)}</div>}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {slot.ocupado && (
                                        <div className="flex gap-1 ml-2">
                                            <button onClick={(e) => handleImprimirSlot(e, slot.agendamento_id)} className="p-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-sm" title="Imprimir"><Printer size={14}/></button>
                                            <button onClick={(e) => { e.stopPropagation(); abrirEditar(slot); }} className="p-1.5 bg-white text-blue-600 border border-blue-100 hover:bg-blue-50 rounded-lg transition-colors shadow-sm"><Pencil size={14}/></button>
                                            <button onClick={(e) => handleExcluirAgendamento(e, slot.agendamento_id)} className="p-1.5 bg-white text-red-500 border border-red-100 hover:bg-red-50 rounded-lg transition-colors shadow-sm"><Trash2 size={14}/></button>
                                        </div>
                                    )}
                                    
                                    {slot.is_encaixe && <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1"><AlertCircle size={10}/> EXTRA</div>}
                                </div>
                            );
                        }) : (
                            <div className="col-span-2 text-center py-20 flex flex-col items-center text-slate-400">
                                <CalendarIcon size={48} className="mb-2 opacity-20"/>
                                <p>Nenhum horário disponível para esta data.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        
        {/* MODAL DE AGENDAMENTO */}
        {modalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                    <div className="bg-blue-600 p-6 text-white flex justify-between items-center"><h2 className="text-xl font-bold">{agendamentoIdEditar ? 'Editar Agendamento' : 'Novo Agendamento'}</h2><button onClick={() => setModalOpen(false)}><X/></button></div>
                    <div className="p-6 space-y-4">
                        {tipoModal === 'encaixe' ? (
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Valor da Consulta</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-500">R$</span>
                                    <input type="number" step="0.01" className="w-full border p-2.5 pl-10 rounded-lg dark:bg-slate-900 dark:text-white" value={valorSelecionado} onChange={e => setValorSelecionado(e.target.value)} placeholder="0.00"/>
                                </div>
                            </div>
                        ) : (
                            parseFloat(valorSelecionado) > 0 && (
                                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl flex items-center justify-between border border-blue-100 dark:border-blue-800">
                                    <div className="font-bold text-sm text-blue-700 dark:text-blue-300">Valor da Consulta</div>
                                    <div className="text-xl font-bold text-blue-800 dark:text-white">R$ {Number(valorSelecionado).toFixed(2)}</div>
                                </div>
                            )
                        )}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Paciente</label>
                                <button onClick={() => setModalPacienteOpen(true)} className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1"><UserPlus size={14}/> Novo Cadastro</button>
                            </div>
                            <SearchableSelect label="" options={pacientes} value={pacienteId} onChange={setPacienteId} placeholder="Pesquisar..." />
                        </div>
                        
                        <SearchableSelect 
                            label="Convênio (Opcional)" 
                            options={convenios} 
                            value={convenioId} 
                            onChange={setConvenioId} 
                            placeholder="Particular..."
                            disabled={convenioTravado}
                        />
                        
                        {tipoModal === 'encaixe' && <div><label className="block text-sm font-bold mb-1">Horário</label><input type="time" className="w-full border p-3 rounded-lg dark:bg-slate-900 dark:text-white" value={encaixeHora} onChange={e => setEncaixeHora(e.target.value)} /></div>}
                        <textarea placeholder="Observações..." className="w-full border p-3 rounded-lg h-24 dark:bg-slate-900 dark:text-white" value={observacao} onChange={e => setObservacao(e.target.value)}></textarea>
                        
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button onClick={salvarAgendamento} disabled={loadingSave} className={`col-span-2 w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 ${agendamentoIdEditar ? '' : 'col-span-2'}`}>
                                {loadingSave ? <Loader2 className="animate-spin" /> : <Save size={20}/>} 
                                {agendamentoIdEditar ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                            </button>
                            {agendamentoIdEditar && (
                                <button onClick={handleImprimir} className="col-span-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold flex items-center justify-center gap-2">
                                    <Printer size={20}/> Imprimir Comprovante
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* MODAL DE NOVO PACIENTE */}
        {modalPacienteOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 overflow-y-auto">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl animate-in fade-in zoom-in duration-200 my-10">
                    <div className="bg-slate-800 p-5 text-white flex justify-between items-center rounded-t-2xl"><h3 className="font-bold flex items-center gap-2 text-lg"><UserPlus size={20}/> Novo Paciente</h3><button onClick={() => setModalPacienteOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button></div>
                    <form onSubmit={salvarPacienteCompleto} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-12 border-b pb-2 mb-2 font-bold text-slate-700 dark:text-white uppercase text-xs tracking-wider">Dados Pessoais</div>
                            <div className="md:col-span-6"><label className="block text-xs mb-1">Nome Completo</label><input name="nome" required value={novoPaciente.nome} onChange={handlePacienteChange} className={inputClass} /></div>
                            <div className="md:col-span-3"><label className="block text-xs mb-1">CPF</label><input name="cpf" required value={novoPaciente.cpf} onChange={handlePacienteChange} className={inputClass} placeholder="000.000.000-00"/></div>
                            <div className="md:col-span-3"><label className="block text-xs mb-1">Sexo</label><select name="sexo" value={novoPaciente.sexo} onChange={handlePacienteChange} className={inputClass}><option value="">Selecione...</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Outro">Outro</option></select></div>
                            <div className="md:col-span-3"><label className="block text-xs mb-1">Nascimento</label><input type="date" name="data_nascimento" required value={novoPaciente.data_nascimento} onChange={handlePacienteChange} className={inputClass} /></div>
                            <div className="md:col-span-3"><label className="block text-xs mb-1">Telefone</label><input name="telefone" value={novoPaciente.telefone} onChange={handlePacienteChange} className={inputClass} placeholder="(00) 00000-0000"/></div>
                            <div className="md:col-span-6"><label className="block text-xs mb-1">Nome da Mãe</label><input name="nome_mae" value={novoPaciente.nome_mae} onChange={handlePacienteChange} className={inputClass} /></div>
                            <div className="md:col-span-12 border-b pb-2 mb-2 mt-4 font-bold text-slate-700 dark:text-white flex items-center gap-2 uppercase text-xs tracking-wider"><MapPin size={16}/> Endereço</div>
                            <div className="md:col-span-3"><label className="block text-xs mb-1">CEP {loadingCep && <Loader2 size={12} className="inline animate-spin text-blue-500"/>}</label><input name="cep" value={novoPaciente.cep} onChange={handlePacienteChange} onBlur={buscarCep} className={inputClass} placeholder="00000-000"/></div>
                            <div className="md:col-span-7"><label className="block text-xs mb-1">Logradouro</label><input name="logradouro" value={novoPaciente.logradouro} onChange={handlePacienteChange} className={inputClass} /></div>
                            <div className="md:col-span-2"><label className="block text-xs mb-1">Número</label><input id="modal-numero" name="numero" value={novoPaciente.numero} onChange={handlePacienteChange} className={inputClass} /></div>
                            <div className="md:col-span-4"><label className="block text-xs mb-1">Complemento</label><input name="complemento" value={novoPaciente.complemento} onChange={handlePacienteChange} className={inputClass} placeholder="Apto, Bloco..."/></div>
                            <div className="md:col-span-4"><label className="block text-xs mb-1">Bairro</label><input name="bairro" value={novoPaciente.bairro} onChange={handlePacienteChange} className={inputClass} /></div>
                            <div className="md:col-span-3"><label className="block text-xs mb-1">Cidade</label><input name="cidade" value={novoPaciente.cidade} onChange={handlePacienteChange} className={inputClass} /></div>
                            <div className="md:col-span-1"><label className="block text-xs mb-1">UF</label><input name="estado" value={novoPaciente.estado} onChange={handlePacienteChange} className={inputClass} maxLength={2} style={{textTransform:'uppercase'}}/></div>
                        </div>
                        <div className="pt-8 flex gap-3 justify-end">
                            <button type="button" onClick={() => setModalPacienteOpen(false)} className="px-6 py-2.5 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                            <button type="submit" disabled={loadingPaciente} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-50">
                                {loadingPaciente ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 
                                Salvar e Usar
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