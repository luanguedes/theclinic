import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Search, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { normalizeSearchText } from '../utils/text';

const STATUS_OPTIONS = ['agendado', 'aguardando', 'em_atendimento', 'finalizado', 'faltou'];

export default function Triagem() {
  const { api } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [agendamentos, setAgendamentos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);

  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [profissionalFiltro, setProfissionalFiltro] = useState('');
  const [buscaTexto, setBuscaTexto] = useState('');
  const [statusVisiveis, setStatusVisiveis] = useState(STATUS_OPTIONS);

  const [now, setNow] = useState(new Date());

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
      const termo = normalizeSearchText(buscaTexto);
      return normalizeSearchText(item.nome_paciente).includes(termo)
        || normalizeSearchText(item.nome_profissional).includes(termo);
    }
    return true;
  });

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

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
                            Realizada
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => navigate(`/triagem/${item.id}`)}
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
      </div>
    </Layout>
  );
}
