import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { 
    CalendarClock, CheckCircle2, Clock, Calculator, ArrowLeft, 
    ChevronDown, X, Users, Pin, Hourglass, Repeat, ListPlus, Pencil, Ban, 
    CalendarDays, DollarSign, ShieldCheck, Plus, Trash2, Loader2, Save, PlusCircle
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

  const filtered = query === ''
    ? options
    : options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (option) => {
    onChange(option.id);
    setQuery(option.label);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type="text"
          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 pr-10 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 transition-all text-sm font-bold"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => !disabled && setIsOpen(true)}
          disabled={disabled}
        />
        <div className="absolute right-3 top-3.5 flex items-center gap-2 text-slate-400">
          <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in duration-100">
          {filtered.length === 0 ? (
            <div className="p-3 text-sm text-slate-400 text-center font-bold">Nenhum resultado.</div>
          ) : (
            <ul>
              {filtered.map((opt) => (
                <li key={opt.id} onClick={() => handleSelect(opt)}
                  className={`p-3 text-sm cursor-pointer transition-colors flex justify-between items-center ${String(value) === String(opt.id) ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700 font-medium text-slate-600 dark:text-slate-300'}`}
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
  const { notify, confirmDialog } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [profissionaisOptions, setProfissionaisOptions] = useState([]);
  const [especialidadesOptions, setEspecialidadesOptions] = useState([]);
  const [conveniosOptions, setConveniosOptions] = useState([]);
  
  const [profissionalId, setProfissionalId] = useState('');
  const [especialidadeId, setEspecialidadeId] = useState('');
  const [convenioId, setConvenioId] = useState('');
  const [valorConsulta, setValorConsulta] = useState('');

  const [regrasAdicionadas, setRegrasAdicionadas] = useState([]);
  const [editingRuleId, setEditingRuleId] = useState(null);

  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [activeTab, setActiveTab] = useState('tempo'); 
  
  const hoje = new Date().toISOString().split('T')[0];
  const [dataInicioVigencia, setDataInicioVigencia] = useState(hoje);
  const [dataFimVigencia, setDataFimVigencia] = useState(hoje);

  const [modoCalculo, setModoCalculo] = useState('final');
  const [horaInicio, setHoraInicio] = useState('08:00');
  const [horaFim, setHoraFim] = useState('12:00');
  const [intervalo, setIntervalo] = useState(30);
  const [quantidade, setQuantidade] = useState(0);

  const [periodoInicio, setPeriodoInicio] = useState('07:00');
  const [periodoFim, setPeriodoFim] = useState('12:00');
  const [periodoIntervalo, setPeriodoIntervalo] = useState(60);
  const [periodoQtd, setPeriodoQtd] = useState(10);

  const [horariosFixos, setHorariosFixos] = useState([{ time: '08:00', qtd: 10 }]);

  const diasSemana = [
    { id: 1, label: 'Seg' }, { id: 2, label: 'Ter' }, { id: 3, label: 'Qua' },
    { id: 4, label: 'Qui' }, { id: 5, label: 'Sex' }, { id: 6, label: 'Sáb' }, { id: 0, label: 'Dom' }
  ];

  // --- LÓGICA DE VÍNCULO INTELIGENTE (DATAS -> DIAS) ---
  useEffect(() => {
    if (!dataInicioVigencia || !dataFimVigencia) return;

    const start = new Date(dataInicioVigencia + 'T00:00:00');
    const end = new Date(dataFimVigencia + 'T00:00:00');

    if (start > end) return;

    const diasNoPeriodo = new Set();
    const tempDate = new Date(start);
    
    // Varre o período para ver quais dias da semana existem nele (limite de segurança de 366 dias)
    let count = 0;
    while (tempDate <= end && count < 366) {
        diasNoPeriodo.add(tempDate.getDay());
        tempDate.setDate(tempDate.getDate() + 1);
        count++;
    }

    // Marca automaticamente os dias que existem no período
    setDiasSelecionados(Array.from(diasNoPeriodo));

  }, [dataInicioVigencia, dataFimVigencia]);

  useEffect(() => {
    if (api) {
        api.get('profissionais/?nopage=true').then(res => {
            const data = res.data.results || res.data;
            setProfissionaisOptions(data.map(p => ({ id: p.id, label: p.nome })));
        });
        api.get('configuracoes/convenios/?nopage=true').then(res => {
            const data = res.data.results || res.data;
            setConveniosOptions(data.map(c => ({ id: c.id, label: c.nome })));
        });
    }
  }, [api]);

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

  const updateHorarioFixo = (index, field, val) => {
    const novos = [...horariosFixos];
    novos[index][field] = val;
    setHorariosFixos(novos);
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
    setDataInicioVigencia(hoje);
    setDataFimVigencia(hoje);
    setValorConsulta('');
    setConvenioId('');
    notify.info("Edição cancelada.");
  };

  const handleAddRule = () => {
    if (!profissionalId) return notify.warning('Selecione o Profissional.');
    if (!especialidadeId) return notify.warning('Selecione a Especialidade.');
    if (diasSelecionados.length === 0) return notify.warning('Selecione ao menos um dia da semana.');
    if (dataInicioVigencia < hoje && !editingRuleId) return notify.warning('A data de início não pode ser retroativa.');
    
    const ruleId = editingRuleId || Date.now(); 
    const nomeConvenio = convenioId 
        ? conveniosOptions.find(c => String(c.id) === String(convenioId))?.label 
        : 'Todos / Particular';

    const novaRegra = {
        id: ruleId, 
        group_id: editingRuleId ? regrasAdicionadas.find(r => r.id === editingRuleId).group_id : generateUUID(), 
        dias: diasSelecionados,
        data_inicio: dataInicioVigencia,
        data_fim: dataFimVigencia,
        convenio: convenioId || null,
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
        novaRegra.resumo = `${periodoInicio} às ${periodoFim} (${periodoQtd} vagas cada ${periodoIntervalo} min)`;
    } else if (activeTab === 'fixo') {
        const validos = horariosFixos.filter(h => h.time && h.qtd);
        if(validos.length === 0) return notify.warning("Adicione horários válidos.");
        novaRegra.detalhes = { horarios: validos };
        novaRegra.resumo = `${validos.length} horários manuais`;
    }

    if (editingRuleId) {
        setRegrasAdicionadas(regrasAdicionadas.map(r => r.id === editingRuleId ? novaRegra : r));
        setEditingRuleId(null);
        notify.success("Regra atualizada no resumo.");
    } else {
        setRegrasAdicionadas([...regrasAdicionadas, novaRegra]);
        notify.success("Regra incluída no resumo.");
    }
  };

  const handleRemoveRule = async (id) => {
    const confirm = await confirmDialog("Deseja remover esta regra do resumo?", "Remover Regra", "Remover", "Manter", "danger");
    if (confirm) {
        if (id === editingRuleId) handleCancelEdit();
        setRegrasAdicionadas(regrasAdicionadas.filter(r => r.id !== id));
    }
  };

  const handleSaveAll = async () => {
    setLoading(true);
    try {
        const promises = [];
        regrasAdicionadas.forEach(regra => {
            regra.dias.forEach(dia => {
                const basePayload = {
                    group_id: regra.group_id, profissional: profissionalId, especialidade: especialidadeId,
                    dia_semana: dia, data_inicio: regra.data_inicio, data_fim: regra.data_fim,
                    valor: regra.valor || 0, convenio: regra.convenio || null 
                };

                if (regra.tipo === 'tempo') {
                    promises.push(api.post('agendas/config/', { ...basePayload, hora_inicio: regra.detalhes.inicio, hora_fim: regra.detalhes.fim, intervalo_minutos: regra.detalhes.intervalo, quantidade_atendimentos: 1, tipo: 'padrao' }));
                } else if (regra.tipo === 'periodo') {
                    promises.push(api.post('agendas/config/', { ...basePayload, hora_inicio: regra.detalhes.inicio, hora_fim: regra.detalhes.fim, intervalo_minutos: regra.detalhes.intervalo, quantidade_atendimentos: regra.detalhes.qtd, tipo: 'periodo' }));
                } else if (regra.tipo === 'fixo') {
                    regra.detalhes.horarios.forEach(h => {
                        promises.push(api.post('agendas/config/', { ...basePayload, hora_inicio: h.time, hora_fim: h.time, intervalo_minutos: 0, quantidade_atendimentos: h.qtd, tipo: 'fixo' }));
                    });
                }
            });
        });

        await Promise.all(promises);
        notify.success("Agenda completa gerada com sucesso!");
        navigate('/agenda/configurar');
    } catch (error) {
        notify.error('Erro crítico ao salvar agendas.');
    } finally { setLoading(false); }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm";
  const labelClass = "block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20 px-4">
        <button onClick={() => navigate('/agenda/configurar')} className="mb-4 flex items-center gap-2 text-slate-500 font-bold hover:text-purple-600 transition-colors text-sm">
            <ArrowLeft size={18}/> Voltar para Lista
        </button>

        <div className="flex items-center gap-3 mb-8">
            <div className="bg-purple-600 p-3 rounded-2xl text-white shadow-lg shadow-purple-500/20"><CalendarClock size={28}/></div>
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Criar Nova Agenda</h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Geração em massa de horários por vigência</p>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <SearchableSelect label="1. Profissional Responsável" placeholder="Buscar médico..." options={profissionaisOptions} value={profissionalId} onChange={setProfissionalId} />
            <SearchableSelect label="2. Especialidade do Atendimento" placeholder="Selecione a área..." options={especialidadesOptions} value={especialidadeId} onChange={setEspecialidadeId} disabled={!profissionalId} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 space-y-8">
                <div className={`bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border-2 transition-all ${editingRuleId ? 'border-purple-500 ring-4 ring-purple-500/10' : 'border-slate-100 dark:border-slate-700'}`}>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tighter">
                            {editingRuleId ? 'Editando Regra Selecionada' : '3. Configurar Regra'}
                        </h2>
                        {editingRuleId && <button onClick={handleCancelEdit} className="text-[10px] bg-red-100 text-red-600 px-4 py-2 rounded-full font-black uppercase tracking-widest hover:bg-red-200 transition-colors">Sair da Edição</button>}
                    </div>

                    <div className="space-y-8">
                        <div>
                            <label className={labelClass}>Vigência do Período</label>
                            <div className="grid grid-cols-2 gap-4">
                                <input type="date" value={dataInicioVigencia} onChange={e => setDataInicioVigencia(e.target.value)} className={inputClass} />
                                <input type="date" value={dataFimVigencia} onChange={e => setDataFimVigencia(e.target.value)} className={inputClass} />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Dias da Semana no Período</label>
                            <div className="flex flex-wrap gap-2">
                                {diasSemana.map(dia => (
                                    <button key={dia.id} type="button" onClick={() => toggleDia(dia.id)}
                                        className={`w-11 h-11 rounded-xl font-black text-xs uppercase transition-all ${diasSelecionados.includes(dia.id) ? 'bg-purple-600 text-white shadow-xl scale-105' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 opacity-60'}`}
                                    >{dia.label}</button>
                                ))}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium uppercase tracking-widest italic">* Selecionados automaticamente com base nas datas.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SearchableSelect label="Convênio Específico" options={conveniosOptions} value={convenioId} onChange={setConvenioId} placeholder="Todos / Particular" />
                            <div>
                                <label className={labelClass}>Valor da Regra</label>
                                <div className="relative"><DollarSign className="absolute left-3 top-3.5 text-slate-400" size={16}/><input type="number" step="0.01" value={valorConsulta} onChange={e => setValorConsulta(e.target.value)} className={`${inputClass} pl-10 font-bold text-purple-600`} placeholder="0.00"/></div>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                            <div className="flex bg-slate-100/50 dark:bg-slate-800 p-1">
                                <button type="button" onClick={() => setActiveTab('tempo')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'tempo' ? 'bg-white dark:bg-slate-700 text-purple-600 rounded-xl shadow-sm' : 'text-slate-400'}`}><Hourglass size={14}/> Por Tempo</button>
                                <button type="button" onClick={() => setActiveTab('periodo')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'periodo' ? 'bg-white dark:bg-slate-700 text-purple-600 rounded-xl shadow-sm' : 'text-slate-400'}`}><Repeat size={14}/> Blocos</button>
                                <button type="button" onClick={() => setActiveTab('fixo')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'fixo' ? 'bg-white dark:bg-slate-700 text-purple-600 rounded-xl shadow-sm' : 'text-slate-400'}`}><Pin size={14}/> Fixos</button>
                            </div>

                            <div className="p-6">
                                {activeTab === 'tempo' && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="flex gap-2 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                                            <button onClick={() => setModoCalculo('final')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${modoCalculo === 'final' ? 'bg-white dark:bg-slate-600 text-purple-600' : 'text-slate-400'}`}>Hora Fim</button>
                                            <button onClick={() => setModoCalculo('quantidade')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase ${modoCalculo === 'quantidade' ? 'bg-white dark:bg-slate-600 text-purple-600' : 'text-slate-400'}`}>Qtd Vagas</button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className={labelClass}>Início</label><input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className={inputClass} /></div>
                                            <div><label className={labelClass}>Duração (min)</label><input type="number" value={intervalo} onChange={e => setIntervalo(Number(e.target.value))} className={inputClass} /></div>
                                            {modoCalculo === 'final' ? (
                                                <>
                                                    <div><label className={labelClass}>Término</label><input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className={inputClass} /></div>
                                                    <div className="flex flex-col justify-end"><div className="bg-purple-600 text-white rounded-xl p-3 flex items-center justify-between shadow-lg shadow-purple-500/20"><span className="text-[9px] font-black uppercase">Vagas</span><span className="text-xl font-black">{quantidade}</span></div></div>
                                                </>
                                            ) : (
                                                <>
                                                    <div><label className={labelClass}>Qtd Vagas</label><input type="number" value={quantidade} onChange={e => setQuantidade(Number(e.target.value))} className={inputClass} /></div>
                                                    <div className="flex flex-col justify-end"><div className="bg-purple-600 text-white rounded-xl p-3 flex items-center justify-between shadow-lg shadow-purple-500/20"><span className="text-[9px] font-black uppercase">Até às</span><span className="text-xl font-black">{horaFim}</span></div></div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'periodo' && (
                                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
                                        <div><label className={labelClass}>Início</label><input type="time" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} className={inputClass} /></div>
                                        <div><label className={labelClass}>Fim</label><input type="time" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} className={inputClass} /></div>
                                        <div><label className={labelClass}>Frequência (min)</label><input type="number" value={periodoIntervalo} onChange={e => setPeriodoIntervalo(Number(e.target.value))} className={inputClass} /></div>
                                        <div><label className={labelClass}>Vagas p/ Bloco</label><input type="number" value={periodoQtd} onChange={e => setPeriodoQtd(Number(e.target.value))} className={inputClass} /></div>
                                    </div>
                                )}
                                {activeTab === 'fixo' && (
                                    <div className="space-y-3 animate-in fade-in duration-300">
                                        {horariosFixos.map((item, index) => (
                                            <div key={index} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800 p-2 rounded-xl">
                                                <input type="time" value={item.time} onChange={e => updateHorarioFixo(index, 'time', e.target.value)} className={inputClass}/>
                                                <input type="number" placeholder="Qtd" value={item.qtd} onChange={e => updateHorarioFixo(index, 'qtd', e.target.value)} className={`${inputClass} w-24 text-center font-bold`}/>
                                                <button type="button" onClick={() => setHorariosFixos(horariosFixos.filter((_, i) => i !== index))} className="text-red-400 hover:text-red-600 p-2 transition-colors"><Trash2 size={20}/></button>
                                            </div>
                                        ))}
                                        <button type="button" onClick={() => setHorariosFixos([...horariosFixos, { time: '', qtd: 1 }])} className="text-purple-600 font-black text-[10px] uppercase flex items-center gap-2 mt-4 hover:underline"><PlusCircle size={16}/> Adicionar outro horário</button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="button" onClick={handleAddRule} className={`w-full py-4 rounded-[20px] font-black uppercase text-xs tracking-widest transition-all active:scale-95 shadow-xl shadow-purple-500/10 ${editingRuleId ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'}`}>
                            {editingRuleId ? 'Salvar Alterações da Regra' : 'Incluir Regra nesta Agenda'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col h-full">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700 flex items-center justify-between">
                        <h3 className="font-black text-slate-800 dark:text-white uppercase text-xs tracking-widest">Resumo Geral</h3>
                        <div className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter">{regrasAdicionadas.length} Regras</div>
                    </div>
                    
                    <div className="p-6 flex-1 overflow-y-auto max-h-[600px] space-y-4">
                        {regrasAdicionadas.length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <ListPlus size={48} className="mx-auto mb-4 opacity-20"/>
                                <p className="font-black uppercase text-[10px] tracking-widest">Lista Vazia</p>
                            </div>
                        ) : (
                            regrasAdicionadas.map((regra) => (
                                <div key={regra.id} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-4 relative animate-in slide-in-from-bottom-2 duration-300 group hover:border-purple-200 transition-colors">
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEditRule(regra)} className="text-slate-400 hover:text-purple-600 bg-white shadow-sm p-1.5 rounded-lg border border-slate-100"><Pencil size={14}/></button>
                                        <button onClick={() => handleRemoveRule(regra.id)} className="text-slate-400 hover:text-red-600 bg-white shadow-sm p-1.5 rounded-lg border border-slate-100"><Trash2 size={14}/></button>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {regra.dias.map(d => <span key={d} className="text-[9px] font-black bg-purple-50 dark:bg-purple-900/30 text-purple-600 px-1.5 py-0.5 rounded uppercase">{diasSemana.find(dia => dia.id === d)?.label}</span>)}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter"><CalendarDays size={12}/> {new Date(regra.data_inicio).toLocaleDateString()} - {new Date(regra.data_fim).toLocaleDateString()}</div>
                                        <div className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{regra.resumo}</div>
                                        <div className="pt-2 flex justify-between items-center border-t dark:border-slate-700 mt-2">
                                            <span className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1"><ShieldCheck size={12}/> {regra.convenio_nome}</span>
                                            {regra.valor > 0 && <span className="font-black text-green-600 text-xs">R$ {Number(regra.valor).toFixed(2)}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-700">
                        <button onClick={handleSaveAll} disabled={loading || regrasAdicionadas.length === 0} className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl shadow-xl shadow-green-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Finalizar e Gravar
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </Layout>
  );
}
