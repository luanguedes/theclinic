import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import Layout from '../../components/Layout';
import { Search, CheckCircle2, Clock, Loader2, Stethoscope } from 'lucide-react';

export default function AtendimentoConsultas() {
  const { api, user } = useAuth();
  const { notify } = useNotification();
  const hasProfissional = !!user?.profissional_id || !!user?.is_superuser;

  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0]);
  const [buscaTexto, setBuscaTexto] = useState('');
  const [apenasTriados, setApenasTriados] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (api && hasProfissional) carregarLista();
  }, [api, dataFiltro, apenasTriados, hasProfissional]);

  const carregarLista = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dataFiltro) params.append('data', dataFiltro);
      if (apenasTriados) params.append('apenas_triados', '1');
      const res = await api.get(`pacientes/atendimento/?${params.toString()}`);
      setAgendamentos(Array.isArray(res.data.results || res.data) ? (res.data.results || res.data) : []);
    } catch (error) {
      notify.error('Erro ao carregar pacientes aguardando atendimento.');
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

  const iniciarAtendimento = async (agendamentoId) => {
    setStartingId(agendamentoId);
    try {
      await api.post(`atendimento/iniciar/${agendamentoId}/`);
      window.open(`/atendimento-consultas/${agendamentoId}`, '_blank');
      carregarLista();
    } catch (error) {
      notify.error('Erro ao iniciar atendimento.');
    } finally {
      setStartingId(null);
    }
  };

  const itensFiltrados = useMemo(() => (
    agendamentos.filter((item) => {
      if (!buscaTexto) return true;
      const termo = buscaTexto.toLowerCase();
      return item.nome_paciente?.toLowerCase().includes(termo) || item.nome_profissional?.toLowerCase().includes(termo);
    })
  ), [agendamentos, buscaTexto]);

  const inputClass = 'w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white transition-all font-bold';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-20 tracking-tight">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
              <CheckCircle2 className="text-emerald-600" size={32} /> Atendimento de Consultas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Pacientes aguardando para consulta medica.</p>
          </div>
        </div>

        {!hasProfissional ? (
          <div className="bg-white dark:bg-slate-800 p-10 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 text-center">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Acesso Restrito</div>
            <p className="text-slate-600 dark:text-slate-300 text-sm font-bold mt-2">
              Vincule um profissional ao operador para visualizar as consultas.
            </p>
          </div>
        ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 mb-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div>
            <label className={labelClass}>Data</label>
            <input type="date" value={dataFiltro} onChange={(e) => setDataFiltro(e.target.value)} className={inputClass} />
          </div>
          <div className="lg:col-span-2">
            <label className={labelClass}>Busca Rapida</label>
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input placeholder="Paciente..." value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} className={`${inputClass} pl-12`} />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setApenasTriados((prev) => !prev)}
              className={`w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                apenasTriados
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-md'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              {apenasTriados ? 'Apenas Triados' : 'Todos os Pacientes'}
            </button>
          </div>
        </div>
        )}

        {hasProfissional && (
        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 min-h-[400px]">
          <div className="overflow-visible">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b dark:border-slate-700 font-black text-[10px] uppercase tracking-widest text-slate-400">
                <tr>
                  <th className="px-8 py-5">Hora / Espera</th>
                  <th className="px-8 py-5">Triagem</th>
                  <th className="px-8 py-5">Paciente</th>
                  <th className="px-8 py-5">Profissional</th>
                  <th className="px-8 py-5 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-20 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-600" size={40} />
                    </td>
                  </tr>
                ) : itensFiltrados.map((item) => {
                  const esperaMin = item.horario_chegada ? calcularEspera(item.horario_chegada) : 0;
                  return (
                    <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all">
                      <td className="px-8 py-6">
                        <div className="font-black text-lg font-mono text-slate-700 dark:text-slate-300">
                          {item.horario?.slice(0, 5)}
                        </div>
                        {item.horario_chegada && (
                          <div className={`text-[10px] font-black uppercase flex items-center gap-1 mt-1 ${esperaMin > 30 ? 'text-red-500 animate-pulse' : 'text-orange-500'}`}>
                            <Clock size={10} /> {esperaMin} min de espera
                          </div>
                        )}
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
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-800 dark:text-white uppercase text-sm">
                          {item.nome_paciente}
                        </div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">{item.nome_especialidade}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase">{item.nome_profissional}</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => iniciarAtendimento(item.id)}
                          disabled={startingId === item.id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-60 flex items-center gap-2 justify-center ml-auto"
                        >
                          {startingId === item.id ? <Loader2 className="animate-spin" size={16} /> : <Stethoscope size={16} />}
                          Iniciar Atendimento
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>
    </Layout>
  );
}
