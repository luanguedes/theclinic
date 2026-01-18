import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Search, CheckCircle2, Clock, Loader2, X, Save, Stethoscope } from 'lucide-react';

const STATUS_OPTIONS = ['agendado', 'aguardando', 'em_atendimento', 'finalizado', 'faltou'];

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

export default function Triagem() {
  const { api } = useAuth();
  const { notify } = useNotification();

  const [loading, setLoading] = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);

  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [profissionalFiltro, setProfissionalFiltro] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [statusVisiveis, setStatusVisiveis] = useState(STATUS_OPTIONS);

  const [now, setNow] = useState(new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loadingTriagem, setLoadingTriagem] = useState(false);
  const [savingTriagem, setSavingTriagem] = useState(false);
  const [triagemId, setTriagemId] = useState(null);

  const [triagemForm, setTriagemForm] = useState({
    queixa_principal: '',
    observacoes_gerais: '',
    peso_kg: '',
    altura_cm: '',
    pressao_sistolica: '',
    pressao_diastolica: ''
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (api) {
      api.get('profissionais/?nopage=true').then((res) => {
        setProfissionais(res.data.results || res.data || []);
      }).catch(() => {});
    }
  }, [api]);

  useEffect(() => {
    if (api) carregarAgenda();
  }, [api, dataFiltro, profissionalFiltro]);

  const carregarAgenda = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dataFiltro) params.append('data', dataFiltro);
      if (profissionalFiltro) params.append('profissional', profissionalFiltro);
      const res = await api.get(`agendamento/?${params.toString()}`);
      setAgendamentos(Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : []);
    } catch (error) {
      notify.error('Erro ao carregar agenda.');
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const calcularEspera = (horaChegada) => {
    if (!horaChegada) return 0;
    const chegada = new Date();
    const [h, m] = horaChegada.split(':');
    chegada.setHours(h, m, 0, 0);
    if (chegada > now) return 0;
    const diffMs = now - chegada;
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const verificarAtraso = (horario, status) => {
    if (status !== 'agendado') return false;
    const dataAgendamento = new Date(`${dataFiltro}T${horario}`);
    return dataFiltro === new Date().toISOString().split('T')[0] && new Date() > new Date(dataAgendamento.getTime() + 15 * 60000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'agendado': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30';
      case 'aguardando': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30';
      case 'em_atendimento': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30';
      case 'finalizado': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30';
      case 'faltou': return 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const itensFiltrados = agendamentos.filter((item) => {
    if (!statusVisiveis.includes(item.status)) return false;
    if (buscaTexto) {
      const termo = buscaTexto.toLowerCase();
      return item.nome_paciente?.toLowerCase().includes(termo) || item.nome_profissional?.toLowerCase().includes(termo);
    }
    return true;
  });

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

  const abrirTriagem = async (item) => {
    setSelectedItem(item);
    setTriagemId(null);
    setTriagemForm({
      queixa_principal: '',
      observacoes_gerais: '',
      peso_kg: '',
      altura_cm: '',
      pressao_sistolica: '',
      pressao_diastolica: ''
    });
    setModalOpen(true);
    setLoadingTriagem(true);

    try {
      const res = await api.get(`atendimento/triagens/?agendamento=${item.id}`);
      const lista = Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : [];
      if (lista.length > 0) {
        const triagem = lista[0];
        setTriagemId(triagem.id);
        setTriagemForm({
          queixa_principal: triagem.queixa_principal || '',
          observacoes_gerais: triagem.observacoes_gerais || '',
          peso_kg: triagem.peso_kg ?? '',
          altura_cm: triagem.altura_cm ?? '',
          pressao_sistolica: triagem.pressao_sistolica ?? '',
          pressao_diastolica: triagem.pressao_diastolica ?? ''
        });
      }
    } catch (error) {
      notify.error('Erro ao carregar triagem.');
    } finally {
      setLoadingTriagem(false);
    }
  };

  const salvarTriagem = async () => {
    if (!selectedItem) return;
    setSavingTriagem(true);
    try {
      const payload = {
        agendamento: selectedItem.id,
        queixa_principal: triagemForm.queixa_principal,
        observacoes_gerais: triagemForm.observacoes_gerais,
        peso_kg: triagemForm.peso_kg || null,
        altura_cm: triagemForm.altura_cm || null,
        pressao_sistolica: triagemForm.pressao_sistolica || null,
        pressao_diastolica: triagemForm.pressao_diastolica || null
      };

      if (triagemId) {
        await api.put(`atendimento/triagens/${triagemId}/`, payload);
      } else {
        await api.post('atendimento/triagens/', payload);
      }

      notify.success('Triagem salva com sucesso.');
      setModalOpen(false);
      setSelectedItem(null);
      carregarAgenda();
    } catch (error) {
      notify.error('Erro ao salvar triagem.');
    } finally {
      setSavingTriagem(false);
    }
  };

  const pesoNum = Number(String(triagemForm.peso_kg || '').replace(',', '.'));
  const alturaNum = Number(String(triagemForm.altura_cm || '').replace(',', '.'));
  const imc = useMemo(() => calcularImc(pesoNum, alturaNum), [pesoNum, alturaNum]);
  const classificacaoImc = classificarImc(imc);
  const obesidadeGrau = classificarObesidade(imc);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-20 tracking-tight">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
              <CheckCircle2 className="text-blue-600" size={32} /> Triagem
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Registro de pre-atendimento e sinais vitais.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Profissional</label>
            <select value={profissionalFiltro} onChange={(e) => setProfissionalFiltro(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {profissionais.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className={labelClass}>Busca Rapida</label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input placeholder="Paciente..." value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} className={`${inputClass} pl-12`} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusVisiveis((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status])}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${statusVisiveis.includes(status) ? getStatusColor(status) + ' shadow-md scale-105' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700 opacity-40'}`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
          <div className="overflow-visible">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-8 py-5">Hora / Espera</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Paciente</th>
                  <th className="px-8 py-5">Profissional</th>
                  <th className="px-8 py-5">Triagem</th>
                  <th className="px-8 py-5 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-600" size={40} />
                    </td>
                  </tr>
                ) : itensFiltrados.map((item) => {
                  const atrasado = verificarAtraso(item.horario, item.status);
                  const esperaMin = item.status === 'aguardando' ? calcularEspera(item.horario_chegada) : 0;
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all">
                      <td className="px-8 py-6">
                        <div className={`font-black text-lg font-mono ${atrasado ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                          {item.horario.slice(0, 5)}
                        </div>
                        {item.status === 'aguardando' && (
                          <div className={`text-[10px] font-black uppercase flex items-center gap-1 mt-1 ${esperaMin > 30 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                            <Clock size={10} /> {esperaMin} min de espera
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusColor(item.status)}`}>
                          {item.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-800 dark:text-white uppercase text-sm">
                          {item.nome_paciente}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{item.nome_especialidade}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">{item.nome_profissional}</div>
                      </td>
                      <td className="px-8 py-6">
                        {item.triagem_realizada ? (
                          <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30">
                            Triagem Realizada
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => abrirTriagem(item)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                          {item.triagem_realizada ? 'Editar Triagem' : 'Fazer Triagem'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {modalOpen && selectedItem && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl w-full max-w-4xl overflow-hidden border border-white/10">
              <div className="bg-blue-600 p-6 text-white relative overflow-hidden">
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-3 rounded-2xl shadow-inner"><Stethoscope size={28} /></div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Triagem</h3>
                    </div>
                    <p className="text-blue-100 text-sm font-bold uppercase tracking-widest mt-1 opacity-80">
                      {selectedItem.nome_paciente}
                    </p>
                  </div>
                  <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {loadingTriagem ? (
                <div className="p-16 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-600" size={36} />
                </div>
              ) : (
                <div className="p-6 space-y-8">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b pb-2">Pre-atendimento</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="md:col-span-2">
                        <label className={labelClass}>Queixa Principal</label>
                        <input
                          value={triagemForm.queixa_principal}
                          onChange={(e) => setTriagemForm((prev) => ({ ...prev, queixa_principal: e.target.value }))}
                          className={inputClass}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className={labelClass}>Observacoes Gerais</label>
                        <textarea
                          value={triagemForm.observacoes_gerais}
                          onChange={(e) => setTriagemForm((prev) => ({ ...prev, observacoes_gerais: e.target.value }))}
                          className={`${inputClass} min-h-[120px]`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Metricas Vitais</h4>
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
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
                  </div>

                  <button
                    onClick={salvarTriagem}
                    disabled={savingTriagem}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                  >
                    {savingTriagem ? <Loader2 className="animate-spin" /> : <Save size={20} />} Salvar Triagem
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
