import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { 
  CalendarClock, CheckCircle2, Clock, Calculator, ArrowLeft, 
  ChevronDown, X, Users, Pin, Hourglass, Repeat, ListPlus, Pencil, Ban, 
  CalendarDays, DollarSign, ShieldCheck, Plus, Trash2 
} from 'lucide-react';

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const SearchableSelect = ({ label, options, value, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    const selected = options.find(o => String(o.id) === String(value));
    setQuery(selected ? selected.label : '');
  }, [value, options]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        const selected = options.find(o => String(o.id) === String(value));
        setQuery(selected ? selected.label : '');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef, value, options]);

  // --- CORREÇÃO AQUI: O nome da variável agora é 'filtered' ---
  const filtered = query === ''
    ? options
    : options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (option) => {
    onChange(option.id);
    setQuery(option.label);
    setIsOpen(false);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{label}</label>
      <div className="relative">
        <input
          type="text"
          className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 pr-10 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-text transition-all`}
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
        />
        <div className="absolute right-3 top-3.5 flex items-center gap-2 text-slate-400">
          {value && !disabled && (
            <button type="button" onClick={clearSelection} className="hover:text-slate-600 dark:hover:text-slate-200"><X size={16} /></button>
          )}
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in duration-100">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-slate-400 text-center">Nenhum resultado.</div>
          ) : (
            <ul>
              {filtered.map((opt) => (
                <li
                  key={opt.id}
                  onClick={() => handleSelect(opt)}
                  className={`p-3 text-sm cursor-pointer transition-colors flex justify-between items-center
                    ${String(value) === String(opt.id) 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                >
                  {opt.label}
                  {String(value) === String(opt.id) && <CheckCircle2 size={16}/>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default function CriarAgenda() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // --- DADOS GERAIS ---
  const [profissionaisOptions, setProfissionaisOptions] = useState([]);
  const [especialidadesOptions, setEspecialidadesOptions] = useState([]);
  const [conveniosOptions, setConveniosOptions] = useState([]);
  
  const [profissionalId, setProfissionalId] = useState('');
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [convenioId, setConvenioId] = useState('');
  const [valorConsulta, setValorConsulta] = useState('');

  // --- LISTA DE REGRAS (CARRINHO) ---
  const [regrasAdicionadas, setRegrasAdicionadas] = useState([]);
  const [editingRuleId, setEditingRuleId] = useState(null);

  // --- ESTADOS DO FORMULÁRIO ---
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [activeTab, setActiveTab] = useState('tempo'); 
  
  const hoje = new Date().toISOString().split('T')[0];
  const [dataInicioVigencia, setDataInicioVigencia] = useState(hoje);
  const [dataFimVigencia, setDataFimVigencia] = useState(hoje);

  // Aba 1: Tempo
  const [modoCalculo, setModoCalculo] = useState('final');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('12:00');
  const [intervalo, setIntervalo] = useState(30);
  const [quantidade, setQuantidade] = useState(0);

  // Aba 2: Periodo
  const [periodoInicio, setPeriodoInicio] = useState('07:00');
  const [periodoFim, setPeriodoFim] = useState('12:00');
  const [periodoIntervalo, setPeriodoIntervalo] = useState(60);
  const [periodoQtd, setPeriodoQtd] = useState(10);

  // Aba 3: Fixo
  const [horariosFixos, setHorariosFixos] = useState([{ time: '08:00', qtd: 10 }]);

  const diasSemana = [
    { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }, { id: 0, label: 'Dom' }
  ];

  // 1. Carregar Profissionais e Convênios
  useEffect(() => {
    if (api) {
        api.get('profissionais/').then(res => {
            const data = res.data.results || res.data;
            setProfissionaisOptions(data.map(p => ({ id: p.id, label: p.nome })));
        });
        api.get('configuracoes/convenios/').then(res => {
            const data = res.data.results || res.data;
            setConveniosOptions(data.map(c => ({ id: c.id, label: c.nome })));
        });
    }
  }, [api]);

  // 2. Carregar Especialidades
  useEffect(() => {
    setEspecialidadesOptions([]);
    setEspecialidadeId(''); 
    if (profissionalId && api) {
      api.get(`profissionais/${profissionalId}/`).then(res => {
        if (res.data.especialidades) {
            const specs = res.data.especialidades.map(vinculo => ({
                id: vinculo.especialidade_leitura || vinculo.especialidade_id || vinculo.especialidade, 
                label: vinculo.nome_especialidade
            }));
            setEspecialidadesOptions(specs);
            if(specs.length === 1) setEspecialidadeId(specs[0].id);
        }
      });
    }
  }, [profissionalId, api]);

  // 3. Cálculos Automáticos
  useEffect(() => {
    if (activeTab === 'tempo') calcularHorariosTempo();
  }, [horaInicio, horaFim, intervalo, quantidade, modoCalculo, activeTab]);

  const timeToMinutes = (time) => {
    if (!time) return 0;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (mins) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const calcularHorariosTempo = () => {
    if (!horaInicio || !intervalo || intervalo <= 0) return;
    const inicioMin = timeToMinutes(horaInicio);

    if (modoCalculo === 'final') {
        if (!horaFim) return;
        const fimMin = timeToMinutes(horaFim);
        if (fimMin <= inicioMin) { setQuantidade(0); return; }
        const diff = fimMin - inicioMin;
        setQuantidade(Math.floor(diff / intervalo));
    } else {
        if (!quantidade) return;
        const duracaoTotal = quantidade * intervalo;
        const fimMin = inicioMin + duracaoTotal;
        if (fimMin >= 1440) setHoraFim('23:59'); 
        else setHoraFim(minutesToTime(fimMin));
    }
  };

  const toggleDia = (id) => {
    if (diasSelecionados.includes(id)) setDiasSelecionados(diasSelecionados.filter(d => d !== id));
    else setDiasSelecionados([...diasSelecionados, id]);
  };

  const addHorarioFixo = () => setHorariosFixos([...horariosFixos, { time: '', qtd: '' }]);
  const updateHorarioFixo = (index, field, val) => {
    const novos = [...horariosFixos];
    novos[index][field] = val;
    setHorariosFixos(novos);
  };
  const removeHorarioFixo = (index) => {
    setHorariosFixos(horariosFixos.filter((_, i) => i !== index));
  };

  const handleEditRule = (regra) => {
    setEditingRuleId(regra.id);
    setActiveTab(regra.tipo);
    setDiasSelecionados(regra.dias);
    setDataInicioVigencia(regra.data_inicio);
    setDataFimVigencia(regra.data_fim);
    setConvenioId(regra.convenio || '');
    setValorConsulta(regra.valor || '');

    setModoCalculo(regra.modoCalculo || 'final');

    if (regra.tipo === 'tempo') {
        setHoraInicio(regra.detalhes.inicio);
        setHoraFim(regra.detalhes.fim);
        setIntervalo(regra.detalhes.intervalo);
        setQuantidade(regra.detalhes.qtd);
    } else if (regra.tipo === 'periodo') {
        setPeriodoInicio(regra.detalhes.inicio);
        setPeriodoFim(regra.detalhes.fim);
        setPeriodoIntervalo(regra.detalhes.intervalo);
        setPeriodoQtd(regra.detalhes.qtd);
    } else if (regra.tipo === 'fixo') {
        setHorariosFixos(regra.detalhes.horarios);
    }
  };

  const handleCancelEdit = () => {
    setEditingRuleId(null);
    setDiasSelecionados([]);
    setHoraInicio('08:00');
    setHoraFim('12:00');
    setHorariosFixos([{ time: '08:00', qtd: 10 }]);
    setDataInicioVigencia(hoje);
    setDataFimVigencia(hoje);
    setValorConsulta('');
    setConvenioId('');
  };

  const handleAddRule = () => {
    if (!profissionalId) return alert('Selecione o Profissional antes de adicionar regras.');
    if (!especialidadeId) return alert('Selecione a Especialidade antes de adicionar regras.');
    if (diasSelecionados.length === 0) return alert('Selecione os dias da semana.');
    if (!dataInicioVigencia || !dataFimVigencia) return alert('Defina o período de vigência da agenda.');
    
    const newGroupId = editingRuleId 
        ? regrasAdicionadas.find(r => r.id === editingRuleId).group_id 
        : generateUUID(); 

    const ruleId = editingRuleId || Date.now(); 

    // Define nome amigável para o convênio
    const nomeConvenio = convenioId 
        ? conveniosOptions.find(c => String(c.id) === String(convenioId))?.label 
        : 'Todos / Particular';

    const novaRegra = {
        id: ruleId, 
        group_id: newGroupId, 
        dias: diasSelecionados,
        data_inicio: dataInicioVigencia,
        data_fim: dataFimVigencia,
        convenio: convenioId || null, // Garante que envie null se vazio
        convenio_nome: nomeConvenio,
        valor: valorConsulta,
        tipo: activeTab,
        modoCalculo: modoCalculo, 
        detalhes: {}
    };

    if (activeTab === 'tempo') {
        novaRegra.detalhes = { inicio: horaInicio, fim: horaFim, intervalo, qtd: 1 };
        novaRegra.resumo = `${horaInicio} às ${horaFim} (${intervalo} min)`;
    } else if (activeTab === 'periodo') {
        novaRegra.detalhes = { inicio: periodoInicio, fim: periodoFim, intervalo: periodoIntervalo, qtd: periodoQtd };
        novaRegra.resumo = `${periodoInicio} às ${periodoFim} (${periodoQtd} vagas a cada ${periodoIntervalo} min)`;
    } else if (activeTab === 'fixo') {
        const validos = horariosFixos.filter(h => h.time && h.qtd);
        if(validos.length === 0) return alert("Adicione pelo menos um horário válido.");
        novaRegra.detalhes = { horarios: validos };
        novaRegra.resumo = `${validos.length} horários específicos`;
    }

    if (editingRuleId) {
        setRegrasAdicionadas(regrasAdicionadas.map(r => r.id === editingRuleId ? novaRegra : r));
        setEditingRuleId(null);
    } else {
        setRegrasAdicionadas([...regrasAdicionadas, novaRegra]);
    }
    
    setDiasSelecionados([]); 
  };

  const handleRemoveRule = (id) => {
    if (id === editingRuleId) handleCancelEdit();
    setRegrasAdicionadas(regrasAdicionadas.filter(r => r.id !== id));
  };

  const handleSaveAll = async () => {
    if (!profissionalId) return alert('Erro: Profissional não selecionado.');
    if (!especialidadeId) return alert('Erro: Especialidade não selecionada.');
    if (regrasAdicionadas.length === 0) return alert('Adicione pelo menos uma regra.');

    setLoading(true);
    try {
        const promises = [];

        regrasAdicionadas.forEach(regra => {
            regra.dias.forEach(dia => {
                const basePayload = {
                    group_id: regra.group_id, 
                    profissional: profissionalId,
                    especialidade: especialidadeId,
                    dia_semana: dia,
                    data_inicio: regra.data_inicio,
                    data_fim: regra.data_fim,
                    valor: regra.valor || 0,
                    convenio: regra.convenio || null 
                };

                if (regra.tipo === 'tempo') {
                    promises.push(api.post('agendas/config/', {
                        ...basePayload,
                        hora_inicio: regra.detalhes.inicio,
                        hora_fim: regra.detalhes.fim,
                        intervalo_minutos: regra.detalhes.intervalo,
                        quantidade_atendimentos: 1, 
                        tipo: 'padrao'
                    }));
                } else if (regra.tipo === 'periodo') {
                    promises.push(api.post('agendas/config/', {
                        ...basePayload,
                        hora_inicio: regra.detalhes.inicio,
                        hora_fim: regra.detalhes.fim,
                        intervalo_minutos: regra.detalhes.intervalo,
                        quantidade_atendimentos: regra.detalhes.qtd,
                        tipo: 'periodo'
                    }));
                } else if (regra.tipo === 'fixo') {
                    regra.detalhes.horarios.forEach(h => {
                        promises.push(api.post('agendas/config/', {
                            ...basePayload,
                            hora_inicio: h.time,
                            hora_fim: h.time,
                            intervalo_minutos: 0,
                            quantidade_atendimentos: h.qtd,
                            tipo: 'fixo'
                        }));
                    });
                }
            });
        });

        await Promise.all(promises);
        alert('Todas as agendas foram criadas com sucesso!');
        navigate('/agenda/configurar');
    } catch (error) {
        console.error("Erro no salvamento:", error.response?.data || error.message);
        alert('Erro ao salvar. Verifique se os campos estão corretos.');
    } finally {
        setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 dark:text-white outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";
  const tabBase = "flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all border-b-2";
  const tabActive = "border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
  const tabInactive = "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20">
        <button onClick={() => navigate('/agenda/configurar')} className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 bg-transparent px-3 py-2 rounded-lg transition-colors">
            <ArrowLeft size={18}/> Voltar para Lista
        </button>

        <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-600 p-3 rounded-xl text-white shadow"><CalendarClock size={28}/></div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Criar Agenda</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Configure múltiplos horários para um profissional.</p>
            </div>
        </div>

        {/* 1. SELEÇÃO DE PROFISSIONAL */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
            <h2 className="font-bold text-lg mb-4 text-slate-800 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">1. Profissional e Especialidade</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchableSelect label="Profissional" placeholder="Pesquisar..." options={profissionaisOptions} value={profissionalId} onChange={setProfissionalId} />
                <SearchableSelect label="Especialidade" placeholder="Selecione..." options={especialidadesOptions} value={especialidadeId} onChange={setEspecialidadeId} disabled={!profissionalId} />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* 2. ÁREA DE CONFIGURAÇÃO */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 2A. DIAS E VIGÊNCIA */}
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border transition-all ${editingRuleId ? 'border-purple-300 dark:border-purple-600 ring-2 ring-purple-100 dark:ring-purple-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            {editingRuleId ? <><Pencil size={20} className="text-purple-600"/> Editando Regra</> : '2. Dias e Vigência'}
                        </h2>
                        {editingRuleId && (
                            <button onClick={handleCancelEdit} className="text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-200 flex items-center gap-1">
                                <Ban size={12}/> Cancelar Edição
                            </button>
                        )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-6">
                        {diasSemana.map(dia => {
                            const isSelected = diasSelecionados.includes(dia.id);
                            return (
                                <button key={dia.id} type="button" onClick={() => toggleDia(dia.id)}
                                    className={`w-12 h-12 rounded-full font-bold flex items-center justify-center transition-all ${isSelected ? 'bg-purple-600 text-white shadow-lg scale-110' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600'}`}
                                >{dia.label}</button>
                            )
                        })}
                    </div>

                    {/* VIGÊNCIA, CONVÊNIO E VALOR */}
                    <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Data Início</label>
                                <input type="date" value={dataInicioVigencia} onChange={e => setDataInicioVigencia(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Data Fim</label>
                                <input type="date" value={dataFimVigencia} onChange={e => setDataFimVigencia(e.target.value)} className={inputClass} />
                            </div>
                            <div>
                                <SearchableSelect 
                                    label="Convênio (Opcional)" 
                                    placeholder="Todos / Particular" 
                                    options={conveniosOptions} 
                                    value={convenioId} 
                                    onChange={setConvenioId}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Valor da Consulta (R$)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-3.5 text-slate-400" size={16}/>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        value={valorConsulta} 
                                        onChange={e => setValorConsulta(e.target.value)} 
                                        className={`${inputClass} pl-10`}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2B. REGRAS DE HORÁRIO (MANTIDO) */}
                <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border overflow-hidden transition-all ${editingRuleId ? 'border-purple-300 dark:border-purple-600 ring-2 ring-purple-100 dark:ring-purple-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800">
                        <div className="flex">
                            <button type="button" onClick={() => setActiveTab('tempo')} className={`${tabBase} ${activeTab === 'tempo' ? tabActive : tabInactive}`}><Hourglass size={18}/> Por Tempo</button>
                            <button type="button" onClick={() => setActiveTab('periodo')} className={`${tabBase} ${activeTab === 'periodo' ? tabActive : tabInactive}`}><Repeat size={18}/> Qtd/Horário</button>
                            <button type="button" onClick={() => setActiveTab('fixo')} className={`${tabBase} ${activeTab === 'fixo' ? tabActive : tabInactive}`}><Pin size={18}/> Horário Fixo</button>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* ABA 1: TEMPO */}
                        {activeTab === 'tempo' && (
                            <div className="animate-in fade-in zoom-in duration-300">
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg mb-6 w-fit">
                                    <button type="button" onClick={() => setModoCalculo('final')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${modoCalculo === 'final' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-white' : 'text-slate-500'}`}><Clock size={16}/> Calcular Final</button>
                                    <button type="button" onClick={() => setModoCalculo('quantidade')} className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all ${modoCalculo === 'quantidade' ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-white' : 'text-slate-500'}`}><Calculator size={16}/> Calcular Qtd.</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className={labelClass}>Início</label><input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={inputClass} /></div>
                                    <div><label className={labelClass}>Tempo (min)</label><input type="number" value={intervalo} onChange={e => setIntervalo(Number(e.target.value))} className={inputClass} /></div>
                                    
                                    {modoCalculo === 'final' ? (
                                        <>
                                            <div><label className={labelClass}>Fim</label><input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className={inputClass} /></div>
                                            <div className="flex flex-col justify-end">
                                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-3 flex items-center justify-between h-[50px]">
                                                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">Total</span>
                                                    <div className="text-right leading-none">
                                                        <span className="text-xl font-bold text-purple-700 dark:text-white">{quantidade}</span>
                                                        <span className="text-[10px] text-purple-600 dark:text-purple-300 ml-1">vagas</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div><label className={labelClass}>Qtd.</label><input type="number" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} className={inputClass} /></div>
                                            <div className="flex flex-col justify-end">
                                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg p-3 flex items-center justify-between h-[50px]">
                                                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase">Término</span>
                                                    <div className="text-right leading-none">
                                                        <span className="text-xl font-bold text-purple-700 dark:text-white">{horaFim}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ABA 2: PERIODO */}
                        {activeTab === 'periodo' && (
                            <div className="animate-in fade-in zoom-in duration-300 grid grid-cols-2 gap-4">
                                <div><label className={labelClass}>Início</label><input type="time" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>Fim</label><input type="time" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className={inputClass} /></div>
                                <div><label className={labelClass}>A cada (min)</label><input type="number" value={periodoIntervalo} onChange={e => setPeriodoIntervalo(Number(e.target.value))} className={inputClass} /></div>
                                <div><label className={labelClass}>Vagas</label><input type="number" value={periodoQtd} onChange={e => setPeriodoQtd(Number(e.target.value))} className={inputClass} /></div>
                            </div>
                        )}

                        {/* ABA 3: FIXO */}
                        {activeTab === 'fixo' && (
                            <div className="animate-in fade-in zoom-in duration-300">
                                {horariosFixos.map((item, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <input type="time" value={item.time} onChange={e => updateHorarioFixo(index, 'time', e.target.value)} className={inputClass}/>
                                        <input type="number" placeholder="Qtd" value={item.qtd} onChange={e => updateHorarioFixo(index, 'qtd', e.target.value)} className={inputClass}/>
                                        {horariosFixos.length > 1 && <button type="button" onClick={() => removeHorarioFixo(index)} className="text-red-500 p-2"><Trash2/></button>}
                                    </div>
                                ))}
                                <button type="button" onClick={addHorarioFixo} className="text-blue-600 font-bold text-sm flex items-center gap-1 mt-2"><Plus size={16}/> Mais Horário</button>
                            </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                            <button 
                                type="button" 
                                onClick={handleAddRule} 
                                className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md ${editingRuleId ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                            >
                                {editingRuleId ? <><CheckCircle2 size={20}/> Atualizar Regra</> : <><ListPlus size={20}/> Incluir nesta Agenda</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. RESUMO DA AGENDA */}
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <CheckCircle2 className="text-green-500"/> Resumo da Criação
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">Verifique as regras antes de salvar.</p>
                    </div>
                    
                    <div className="p-4 flex-1 overflow-y-auto max-h-[500px] space-y-3">
                        {regrasAdicionadas.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                                <ListPlus size={32} className="mx-auto mb-2 opacity-50"/>
                                <p>Nenhuma regra adicionada.</p>
                                <p className="text-xs">Configure ao lado e clique em "Incluir".</p>
                            </div>
                        ) : (
                            regrasAdicionadas.map((regra, idx) => (
                                <div key={regra.id} className={`bg-slate-50 dark:bg-slate-700/30 border rounded-lg p-3 relative group animate-in slide-in-from-right-2 duration-300 ${editingRuleId === regra.id ? 'border-purple-400 ring-1 ring-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-600'}`}>
                                    <div className="absolute top-2 right-2 flex gap-1">
                                        <button onClick={() => handleEditRule(regra)} className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Editar"><Pencil size={14}/></button>
                                        <button onClick={() => handleRemoveRule(regra.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Remover"><X size={16}/></button>
                                    </div>
                                    <div className="pr-12">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {regra.dias.map(d => (
                                                <span key={d} className="text-[10px] uppercase font-bold bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">{diasSemana.find(dia => dia.id === d)?.label}</span>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                                            <CalendarDays size={10}/> {new Date(regra.data_inicio).toLocaleDateString()} até {new Date(regra.data_fim).toLocaleDateString()}
                                        </p>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {regra.tipo === 'tempo' && <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1"><Hourglass size={12}/> Por Tempo</span>}
                                            {regra.tipo === 'periodo' && <span className="text-orange-600 dark:text-orange-400 flex items-center gap-1"><Repeat size={12}/> Qtd/Horário</span>}
                                            {regra.tipo === 'fixo' && <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><Pin size={12}/> Fixo</span>}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{regra.resumo}</p>
                                        
                                        {/* MOSTRA CONVÊNIO E VALOR NO RESUMO */}
                                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 text-xs flex justify-between items-center">
                                            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300"><ShieldCheck size={12}/> {regra.convenio_nome}</span>
                                            {regra.valor > 0 && <span className="font-bold text-green-600 dark:text-green-400">R$ {Number(regra.valor).toFixed(2)}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
                        <button onClick={handleSaveAll} disabled={loading || regrasAdicionadas.length === 0} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
                            {loading ? 'Salvando...' : 'Salvar Todas as Agendas'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}