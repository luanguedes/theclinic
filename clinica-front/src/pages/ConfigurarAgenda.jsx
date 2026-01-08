import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarRange, Search, Plus, Filter, Edit, Trash2, 
  X, Save, Clock, CalendarDays, PlusCircle, Calculator, DollarSign, Pin, Hourglass, Repeat, ShieldCheck, Users, ListFilter, ChevronDown, Check, RotateCcw 
} from 'lucide-react';

// --- HELPERS DE TEMPO (Para o Cálculo Real-Time) ---
const timeToMinutes = (time) => {
    if (!time) return 0;
    // Divide HH:MM:SS ou HH:MM e pega apenas os 2 primeiros
    const parts = String(time).split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    return (h * 60) + m;
};

const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
};

// --- COMPONENTES AUXILIARES ---
const FilterSearchableSelect = ({ options, value, onChange, placeholder, onEnter }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [text, setText] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        if (!value) setText('');
        else {
            const found = options.find(o => String(o.id) === String(value));
            if (found) setText(found.label);
        }
    }, [value, options]);

    const filtered = options.filter(o => o.label.toLowerCase().includes(text.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                if (value) {
                    const found = options.find(o => String(o.id) === String(value));
                    if (found) setText(found.label);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [value, options]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered.length === 1) {
                onChange(filtered[0].id);
                setText(filtered[0].label);
                setIsOpen(false);
                if(onEnter) setTimeout(() => onEnter(), 50); 
            } else if (value && onEnter) {
                onEnter();
            }
        }
    };

    return (
        <div className="relative w-full h-full" ref={containerRef}>
            <input 
                type="text" 
                className="w-full h-full pl-3 pr-8 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-700 outline-none dark:text-white focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                placeholder={placeholder}
                value={text}
                onChange={e => { setText(e.target.value); setIsOpen(true); onChange(''); }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
            />
            {isOpen && (
                <ul className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-b-xl shadow-xl max-h-60 overflow-auto z-50">
                    {filtered.length > 0 ? filtered.map(opt => (
                        <li key={opt.id} onMouseDown={() => { onChange(opt.id); setText(opt.label); setIsOpen(false); }} className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm dark:text-white flex justify-between">
                            {opt.label}
                        </li>
                    )) : <li className="px-4 py-2 text-slate-400 text-xs">Sem resultados</li>}
                </ul>
            )}
        </div>
    );
};

const CustomDropdown = ({ options, value, onChange, icon: Icon, widthClass = "w-full" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);
    const selectedLabel = options.find(o => o.value === value)?.label || "Selecione";

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${widthClass} h-full`} ref={containerRef}>
            <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between w-full h-full px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all outline-none ${isOpen ? 'rounded-tl-xl' : 'rounded-l-xl'}`}>
                <div className="flex items-center gap-2 truncate">{Icon && <Icon size={18} className="text-slate-500"/>}<span>{selectedLabel}</span></div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 w-full min-w-[200px] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in duration-100">
                    <ul className="max-h-60 overflow-auto py-1">
                        {options.map((opt) => (
                            <li key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-2.5 text-sm cursor-pointer flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors ${value === opt.value ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                                {opt.label} {value === opt.value && <Check size={14}/>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default function ConfigurarAgenda() {
  const { api } = useAuth();
  const { notify, confirmDialog } = useNotification();
  const navigate = useNavigate();

  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [profissionaisFilter, setProfissionaisFilter] = useState([]);
  const [especialidadesFilter, setEspecialidadesFilter] = useState([]);
  const [conveniosFilter, setConveniosFilter] = useState([]);

  // Estados de Filtro
  const [filterType, setFilterType] = useState('texto'); 
  const [filterValue, setFilterValue] = useState(''); 
  const [activeFilters, setActiveFilters] = useState([]); 
  const [statusFilter, setStatusFilter] = useState('ativos'); 
  
  // Modal & Edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); 
  const [editingDays, setEditingDays] = useState([]);
  const [editModoCalculo, setEditModoCalculo] = useState('final');
  const [editHorariosFixos, setEditHorariosFixos] = useState([]); 
  const [saving, setSaving] = useState(false);
  
  const [allConvenios, setAllConvenios] = useState([]);

  const diasMap = [
    { id: 1, label: 'Seg', full: 'Segunda-feira' }, { id: 2, label: 'Ter', full: 'Terça-feira' }, { id: 3, label: 'Qua', full: 'Quarta-feira' },
    { id: 4, label: 'Qui', full: 'Quinta-feira' }, { id: 5, label: 'Sex', full: 'Sexta-feira' }, { id: 6, label: 'Sáb', full: 'Sábado' }, { id: 0, label: 'Dom', full: 'Domingo' }
  ];

  const filterTypeOptions = [
      { value: 'texto', label: 'Busca Geral' },
      { value: 'data_inicial', label: 'Data Inicial' },
      { value: 'data_final', label: 'Data Final' },
      { value: 'data_especifica', label: 'Data Específica' },
      { value: 'profissional_id', label: 'Profissional' },
      { value: 'especialidade_id', label: 'Especialidade' },
      { value: 'convenio_id', label: 'Convênio' },
      { value: 'dia_filtro', label: 'Dia da Semana' },
  ];

  const formatData = (dataString) => { if (!dataString) return '-'; const [ano, mes, dia] = dataString.split('-'); return `${dia}/${mes}/${ano}`; };
  const formatDateBr = (dateString) => { if(!dateString) return ''; const [year, month, day] = dateString.split('-'); return `${day}/${month}/${year}`; };

  const getStatusBadge = (item) => {
      const hoje = new Date().toISOString().split('T')[0];
      if (!item.situacao) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600 border border-slate-300">Encerrada</span>;
      if (item.data_fim < hoje) return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">Vencida</span>;
      return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">Ativa</span>;
  };

  // --- CARREGAMENTO INICIAL ---
  useEffect(() => {
    if (api) {
        // Carrega opções e dados INICIAIS
        api.get(`agendas/config/filters_data/?status=${statusFilter}`).then(res => {
            setProfissionaisFilter(res.data.profissionais);
            setEspecialidadesFilter(res.data.especialidades);
        });
        
        api.get('configuracoes/convenios/').then(res => {
            const data = res.data.results || res.data;
            const options = data.map(c => ({ id: c.id, label: c.nome }));
            setConveniosFilter([{ id: 'sem_convenio', label: 'Particular (Sem Convênio)' }, ...options]);
            setAllConvenios(data.map(c => ({ id: c.id, nome: c.nome })));
        });
        
        // Carga inicial explícita
        loadData();
    }
  }, [api, statusFilter]);

  // Recarrega sempre que mudar os filtros ativos
  useEffect(() => { if(api) loadData(); }, [activeFilters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', statusFilter);
      activeFilters.forEach(f => {
          const key = f.type === 'texto' ? 'search' : f.type;
          if (f.value) params.append(key, f.value);
      });
      const response = await api.get(`agendas/config/?${params.toString()}`);
      setConfigs(response.data.results || response.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const addFilter = () => {
      if (!filterValue) return;
      let label = filterValue;
      if (['data_inicial', 'data_final', 'data_especifica'].includes(filterType)) label = formatDateBr(filterValue);
      else if (filterType === 'profissional_id') label = profissionaisFilter.find(p => String(p.id) === String(filterValue))?.label || 'Desconhecido';
      else if (filterType === 'especialidade_id') label = especialidadesFilter.find(e => String(e.id) === String(filterValue))?.label || 'Desconhecida';
      else if (filterType === 'convenio_id') label = conveniosFilter.find(c => String(c.id) === String(filterValue))?.label || 'Desconhecido';
      else if (filterType === 'dia_filtro') label = diasMap.find(d => String(d.id) === String(filterValue))?.full;
      
      const typeLabel = filterTypeOptions.find(o => o.value === filterType)?.label;
      const newFilter = { id: Date.now(), type: filterType, value: filterValue, display: `${typeLabel}: ${label}` };
      const cleanFilters = activeFilters.filter(f => f.type !== filterType);
      setActiveFilters([...cleanFilters, newFilter]);
      setFilterValue('');
  };

  const removeFilter = (id) => setActiveFilters(activeFilters.filter(f => f.id !== id));
  const clearAllFilters = () => { setActiveFilters([]); setFilterValue(''); };
  const handleKeyDown = (e) => { if (e.key === 'Enter') addFilter(); };

  const renderDynamicInput = () => {
      const commonClass = "w-full pl-3 pr-12 bg-white dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-700 p-3 outline-none dark:text-white focus:ring-2 focus:ring-blue-100 transition-all h-full";
      switch (filterType) {
          case 'data_inicial': case 'data_final': case 'data_especifica':
              return <input type="date" value={filterValue} onChange={e => setFilterValue(e.target.value)} className={commonClass} onKeyDown={handleKeyDown}/>;
          case 'dia_filtro':
              return <select value={filterValue} onChange={e => setFilterValue(e.target.value)} className={`${commonClass} cursor-pointer`}><option value="">Selecione...</option>{diasMap.map(dia => <option key={dia.id} value={dia.id}>{dia.full}</option>)}</select>;
          case 'profissional_id': return <FilterSearchableSelect placeholder="Digite o Profissional..." options={profissionaisFilter} value={filterValue} onChange={setFilterValue} onEnter={addFilter} />;
          case 'especialidade_id': return <FilterSearchableSelect placeholder="Digite a Especialidade..." options={especialidadesFilter} value={filterValue} onChange={setFilterValue} onEnter={addFilter} />;
          case 'convenio_id': return <FilterSearchableSelect placeholder="Digite o Convênio..." options={conveniosFilter} value={filterValue} onChange={setFilterValue} onEnter={addFilter} />;
          default: return <input placeholder="Digite para buscar..." value={filterValue} onChange={e => setFilterValue(e.target.value)} className={commonClass} onKeyDown={handleKeyDown}/>;
      }
  };

  // --- FUNÇÕES DO MODAL ---
  
  // 1. RECALCULO AUTOMÁTICO EM TEMPO REAL (CORRIGIDO)
  useEffect(() => {
    if (!isModalOpen || !editingItem) return;
    if (editingItem.tipo !== 'padrao' && editingItem.tipo !== 'tempo') return;

    const { hora_inicio, hora_fim, intervalo_minutos, quantidade_atendimentos } = editingItem;
    
    // Converte para números para cálculo seguro
    const intervalo = parseInt(intervalo_minutos, 10);
    const qtdAtual = parseInt(quantidade_atendimentos, 10);
    const inicioMin = timeToMinutes(hora_inicio);

    if (!hora_inicio || !intervalo || intervalo <= 0) return;

    if (editModoCalculo === 'final') {
        // MODO FINAL: Calcula QTD baseado em Inicio/Fim
        if (!hora_fim) return;
        const fimMin = timeToMinutes(hora_fim);
        
        if (fimMin <= inicioMin) { 
             if(qtdAtual !== 0) setEditingItem(prev => ({ ...prev, quantidade_atendimentos: 0 })); 
             return; 
        }

        const diff = fimMin - inicioMin;
        const novaQtd = Math.floor(diff / intervalo);
        
        if (novaQtd !== qtdAtual) { 
            setEditingItem(prev => ({ ...prev, quantidade_atendimentos: novaQtd })); 
        }
    } else {
        // MODO QTD: Calcula Fim baseado em Inicio/Qtd
        if (!qtdAtual && qtdAtual !== 0) return;
        
        const duracaoTotal = qtdAtual * intervalo;
        const fimMin = inicioMin + duracaoTotal;
        
        let novoFim = '';
        if (fimMin >= 1440) novoFim = '23:59'; 
        else novoFim = minutesToTime(fimMin);

        // Compara em minutos para evitar loop de string ("08:00" vs "08:00:00")
        if (timeToMinutes(novoFim) !== timeToMinutes(hora_fim)) { 
            setEditingItem(prev => ({ ...prev, hora_fim: novoFim })); 
        }
    }
  }, [
      // Dependências primitivas para evitar loops infinitos
      editingItem?.hora_inicio, 
      editingItem?.hora_fim, 
      editingItem?.intervalo_minutos, 
      editingItem?.quantidade_atendimentos, 
      editModoCalculo, 
      isModalOpen
  ]);

  const handleDelete = async (item) => {
    const msg = item.total_agendados > 0 ? `ATENÇÃO: Existem ${item.total_agendados} pacientes agendados! Se excluir, eles ficarão como 'Encaixe'.` : "Isso excluirá permanentemente esta agenda.";
    const confirmed = await confirmDialog(msg, "Excluir Agenda", "Sim, excluir", "Cancelar", "danger");
    if (confirmed) { try { await api.put(`agendas/config/update-group/${item.group_id}/`, { dias_semana: [] }); loadData(); notify.success("Agenda excluída."); } catch (error) { notify.error("Erro ao excluir."); } }
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item, situacao: item.situacao !== undefined && item.situacao !== null ? item.situacao : true });
    const diasIniciais = (item.dias_vinculados && item.dias_vinculados.length > 0) ? item.dias_vinculados : (item.dia_semana !== undefined ? [item.dia_semana] : []);
    setEditingDays(diasIniciais);
    setEditModoCalculo('final'); 
    if (item.tipo === 'fixo') {
        const horarios = item.horarios_fixos_detalhes && item.horarios_fixos_detalhes.length > 0 ? item.horarios_fixos_detalhes : [{ time: item.hora_inicio, qtd: item.quantidade_atendimentos }];
        setEditHorariosFixos(horarios); 
    } else { setEditHorariosFixos([]); }
    setIsModalOpen(true);
  };

  const toggleEditDay = (id) => { if (editingDays.includes(id)) setEditingDays(editingDays.filter(d => d !== id)); else setEditingDays([...editingDays, id]); };
  const addHorarioFixo = () => setEditHorariosFixos([...editHorariosFixos, { time: '', qtd: 1 }]);
  const removeHorarioFixo = (idx) => setEditHorariosFixos(editHorariosFixos.filter((_, i) => i !== idx));
  const updateHorarioFixo = (idx, field, val) => { const novos = [...editHorariosFixos]; novos[idx][field] = val; setEditHorariosFixos(novos); };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (editingDays.length === 0) return notify.warning("Selecione pelo menos um dia.");
    setSaving(true);
    try {
        const payload = { tipo: editingItem.tipo, dias_semana: editingDays, data_inicio: editingItem.data_inicio, data_fim: editingItem.data_fim, valor: editingItem.valor, convenio: editingItem.convenio || null, situacao: editingItem.situacao };
        if (editingItem.tipo === 'fixo') { payload.lista_horarios = editHorariosFixos.filter(h => h.time); } 
        else { payload.hora_inicio = editingItem.hora_inicio; payload.hora_fim = editingItem.hora_fim; payload.intervalo_minutos = editingItem.intervalo_minutos; payload.quantidade_atendimentos = editingItem.quantidade_atendimentos; }
        await api.put(`agendas/config/update-group/${editingItem.group_id}/`, payload); setIsModalOpen(false); loadData(); notify.success("Agenda atualizada!");
    } catch (error) { notify.error("Erro ao atualizar."); } finally { setSaving(false); }
  };

  const thClass = "px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider";
  const tdClass = "px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300";
  const inputModalClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 dark:text-white outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2"><CalendarRange className="text-purple-600"/> Configuração de Horários</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie as regras de atendimento e vigência.</p>
            </div>
            <button onClick={() => navigate('/agenda/criar')} className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"><Plus size={20}/> Nova Agenda</button>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col lg:flex-row gap-4 items-start">
            <div className="flex-1 w-full">
                <div className="flex shadow-sm h-12 w-full">
                    <div className="w-[220px] z-20">
                        <CustomDropdown options={filterTypeOptions} value={filterType} onChange={(val) => { setFilterType(val); setFilterValue(''); }} icon={ListFilter}/>
                    </div>
                    <div className="relative flex-1 z-10">
                        {renderDynamicInput()}
                        <button onClick={addFilter} disabled={!filterValue} className="absolute right-1 top-1 bottom-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 rounded-lg font-bold text-sm transition-colors flex items-center gap-1">
                            <Plus size={16}/> <span className="hidden sm:inline">Adicionar</span>
                        </button>
                    </div>
                </div>
                {activeFilters.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {activeFilters.map(filter => (
                            <div key={filter.id} className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm">
                                <span>{filter.display}</span>
                                <button onClick={() => removeFilter(filter.id)} className="hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-full p-0.5 transition-colors"><X size={12}/></button>
                            </div>
                        ))}
                        <button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 underline font-medium ml-2 flex items-center gap-1"><Trash2 size={12}/> Limpar tudo</button>
                    </div>
                )}
            </div>
            <div className="w-full lg:w-56 h-12 relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 pointer-events-none z-10"><Filter size={18} /></div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full h-full pl-10 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium text-slate-700 dark:text-slate-300 appearance-none cursor-pointer hover:border-purple-300 transition-colors">
                    <option value="ativos">Apenas Ativos</option><option value="encerrados">Apenas Encerrados</option><option value="todos">Mostrar Todos</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={14} /></div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <tr><th className={thClass}>Situação</th><th className={thClass}>Profissional</th><th className={thClass}>Dias</th><th className={thClass}>Detalhes</th><th className={thClass}>Vigência</th><th className={thClass}>Agendados</th><th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {configs.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                <td className={tdClass}>{getStatusBadge(item)}</td>
                                <td className={tdClass}><div className="font-bold text-slate-800 dark:text-white">{item.nome_profissional}</div><div className="text-xs text-slate-500">{item.nome_especialidade}</div><div className="flex items-center gap-1 text-xs text-blue-600 mt-1"><ShieldCheck size={12}/> {item.nome_convenio || 'Todos / Particular'}</div></td>
                                <td className={tdClass}><div className="flex gap-1 flex-wrap max-w-[150px]">{item.dias_vinculados && item.dias_vinculados.length > 0 ? (item.dias_vinculados.map(d => <span key={d} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded text-[10px] font-bold uppercase border border-blue-100 dark:border-blue-800">{diasMap.find(dm => dm.id === d)?.label}</span>)) : (<span className="px-1.5 py-0.5 bg-gray-50 text-gray-500 rounded text-[10px] font-bold uppercase border">{diasMap.find(dm => dm.id === item.dia_semana)?.label || '-'}</span>)}</div></td>
                                <td className={tdClass}>{item.tipo === 'fixo' ? (<div><span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold mb-1 inline-block">FIXO</span><div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">{item.horarios_fixos_detalhes?.map((h, i) => <div key={i}>{String(h.time).slice(0,5)} - {h.qtd} vagas</div>)}</div></div>) : item.tipo === 'periodo' ? (<div><span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold mb-1 inline-block">QTD/HORA</span><div className="text-xs text-slate-500">{item.quantidade_atendimentos} vagas a cada {item.intervalo_minutos} min</div></div>) : (<div><span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold mb-1 inline-block">POR TEMPO</span><div className="text-xs text-slate-500">Intervalo de {item.intervalo_minutos} min</div></div>)}</td>
                                <td className={tdClass}><div className="text-xs flex flex-col gap-1"><span className="flex items-center gap-1"><CalendarDays size={12}/> {formatData(item.data_inicio)}</span><span className="text-slate-400">até {formatData(item.data_fim)}</span>{item.valor > 0 && <span className="text-green-600 font-bold">R$ {Number(item.valor).toFixed(2)}</span>}</div></td>
                                <td className={tdClass}><div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-xs ${item.total_agendados > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}><Users size={12}/> {item.total_agendados}</div></td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={() => handleEdit(item)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><Edit size={18}/></button><button onClick={() => handleDelete(item)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 size={18}/></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {isModalOpen && editingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                    <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-700 shrink-0">
                        <div><h3 className="text-lg font-bold text-slate-800 dark:text-white">Editar Regra</h3><p className="text-xs text-slate-500">{editingItem.nome_profissional}</p></div>
                        <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                    </div>
                    <form onSubmit={handleSaveEdit} className="p-6 space-y-5 overflow-y-auto">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl flex items-center justify-between border border-slate-200 dark:border-slate-700">
                            <div><span className="block text-sm font-bold text-slate-700 dark:text-white">Situação da Agenda</span><span className="text-xs text-slate-500">{editingItem.situacao ? 'Esta agenda está ativa.' : 'Esta agenda está encerrada (invisível).'}</span></div>
                            <button type="button" onClick={() => setEditingItem({...editingItem, situacao: !editingItem.situacao})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editingItem.situacao ? 'bg-green-500' : 'bg-slate-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editingItem.situacao ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                        </div>
                        <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Dias de Atendimento</label><div className="flex flex-wrap gap-2">{diasMap.map(dia => (<button key={dia.id} type="button" onClick={() => toggleEditDay(dia.id)} className={`w-9 h-9 rounded-full font-bold flex items-center justify-center transition-all text-xs ${editingDays.includes(dia.id) ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>{dia.label}</button>))}</div></div>
                        <div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-slate-500 mb-1">Início</label><input type="date" value={editingItem.data_inicio} onChange={e => setEditingItem({...editingItem, data_inicio: e.target.value})} className={inputModalClass}/></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Fim</label><input type="date" value={editingItem.data_fim} onChange={e => setEditingItem({...editingItem, data_fim: e.target.value})} className={inputModalClass}/></div></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Convênio</label><select className={inputModalClass} value={editingItem.convenio || ''} onChange={e => setEditingItem({...editingItem, convenio: e.target.value || null})}><option value="">Todos / Particular</option>{allConvenios.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
                            <div><label className="block text-xs font-medium text-slate-500 mb-1">Valor (R$)</label><div className="relative"><DollarSign className="absolute left-2 top-2.5 text-slate-400" size={14}/><input type="number" step="0.01" value={editingItem.valor} onChange={e => setEditingItem({...editingItem, valor: e.target.value})} className={`${inputModalClass} pl-7`}/></div></div>
                        </div>
                        <hr className="border-slate-100 dark:border-slate-700"/>
                        {(editingItem.tipo === 'padrao' || editingItem.tipo === 'tempo') && (
                            <div className="animate-in fade-in zoom-in duration-300">
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg mb-4 w-fit mx-auto"><button type="button" onClick={() => setEditModoCalculo('final')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${editModoCalculo === 'final' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-white' : 'text-slate-500'}`}><Clock size={14}/> Calc. Final</button><button type="button" onClick={() => setEditModoCalculo('quantidade')} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all ${editModoCalculo === 'quantidade' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-white' : 'text-slate-500'}`}><Calculator size={14}/> Calc. Qtd.</button></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Início</label><input type="time" value={editingItem.hora_inicio} onChange={e => setEditingItem({...editingItem, hora_inicio: e.target.value})} className={inputModalClass}/></div>
                                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Tempo (min)</label><input type="number" value={editingItem.intervalo_minutos} onChange={e => setEditingItem({...editingItem, intervalo_minutos: e.target.value})} className={inputModalClass}/></div>
                                    {editModoCalculo === 'final' ? (
                                        <><div><label className="block text-xs font-medium text-slate-500 mb-1">Fim</label><input type="time" value={editingItem.hora_fim} onChange={e => setEditingItem({...editingItem, hora_fim: e.target.value})} className={inputModalClass}/></div><div className="flex flex-col justify-end"><div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-2.5 flex items-center justify-between h-[42px]"><span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">Total</span><div><span className="text-lg font-bold text-purple-700 dark:text-white">{editingItem.quantidade_atendimentos}</span><span className="text-[10px] text-purple-600 dark:text-purple-300 ml-1">vagas</span></div></div></div></>
                                    ) : (<><div><label className="block text-xs font-medium text-slate-500 mb-1">Qtd.</label><input type="number" value={editingItem.quantidade_atendimentos} onChange={e => setEditingItem({...editingItem, quantidade_atendimentos: e.target.value})} className={inputModalClass}/></div><div className="flex flex-col justify-end"><div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-2.5 flex items-center justify-between h-[42px]"><span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">Término</span><span className="text-lg font-bold text-purple-700 dark:text-white">{editingItem.hora_fim}</span></div></div></>)}
                                </div>
                            </div>
                        )}
                        {editingItem.tipo === 'periodo' && (<div className="grid grid-cols-2 gap-4"><div><label className="block text-xs font-medium text-slate-500 mb-1">Início</label><input type="time" value={editingItem.hora_inicio} onChange={e => setEditingItem({...editingItem, hora_inicio: e.target.value})} className={inputModalClass}/></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Fim</label><input type="time" value={editingItem.hora_fim} onChange={e => setEditingItem({...editingItem, hora_fim: e.target.value})} className={inputModalClass}/></div><div><label className="block text-xs font-medium text-slate-500 mb-1">A cada (min)</label><input type="number" value={editingItem.intervalo_minutos} onChange={e => setEditingItem({...editingItem, intervalo_minutos: e.target.value})} className={inputModalClass}/></div><div><label className="block text-xs font-medium text-slate-500 mb-1">Vagas</label><input type="number" value={editingItem.quantidade_atendimentos} onChange={e => setEditingItem({...editingItem, quantidade_atendimentos: e.target.value})} className={inputModalClass}/></div></div>)}
                        {editingItem.tipo === 'fixo' && (<div><label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Lista de Horários Fixos</label><div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">{editHorariosFixos.map((h, idx) => (<div key={idx} className="flex gap-2"><input type="time" value={h.time} onChange={e => updateHorarioFixo(idx, 'time', e.target.value)} className={inputModalClass}/><input type="number" placeholder="Qtd" value={h.qtd} onChange={e => updateHorarioFixo(idx, 'qtd', e.target.value)} className={`${inputModalClass} w-24`}/><button type="button" onClick={() => removeHorarioFixo(idx)} className="text-red-500 p-2"><Trash2 size={18}/></button></div>))}</div><button type="button" onClick={addHorarioFixo} className="mt-2 text-blue-600 text-sm font-bold flex items-center gap-1"><PlusCircle size={16}/> Adicionar Horário</button></div>)}
                        <div className="pt-4 flex justify-end gap-2 shrink-0"><button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button><button type="submit" disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg">{saving ? 'Salvando...' : <><Save size={18}/> Salvar Alterações</>}</button></div>
                    </form>
                </div>
            </div>
        )}
      </div>
    </Layout>
  );
}