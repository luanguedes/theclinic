import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  Search, UserPlus, MapPin, Pencil, Trash2, Save, ArrowLeft, Loader2, 
  User, Heart, Accessibility, Users, Baby, Eye, EyeOff, ShieldCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import Layout from '../components/Layout';

const PRIORIDADES = {
    'idoso': { label: 'Idoso (60+)', icon: <Users size={14} />, color: 'text-amber-500' },
    'gestante': { label: 'Gestante', icon: <Baby size={14} />, color: 'text-pink-500' },
    'cadeirante': { label: 'Cadeirante', icon: <Accessibility size={14} />, color: 'text-blue-500' },
    'autista': { label: 'TEA (Autismo)', icon: <Heart size={14} />, color: 'text-teal-500' },
    'pcd': { label: 'PCD', icon: <Accessibility size={14} />, color: 'text-purple-500' },
};

export default function Pacientes() {
  const { api, user } = useAuth();
  const { notify, confirmDialog } = useNotification();
  
  const [viewMode, setViewMode] = useState('list');
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [verCpfs, setVerCpfs] = useState({}); 

  const [pacientes, setPacientes] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const formInicial = {
    nome: '', nome_mae: '', sexo: '', cpf: '', data_nascimento: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    prioridade: '', aceite_lgpd: false 
  };
  const [form, setForm] = useState(formInicial);

  const hoje = new Date().toISOString().split('T')[0];

  // --- MÁSCARAS E UTILITÁRIOS ---
  const mascaraCPF = (v) => {
    return v
      .replace(/\D/g, '') // Remove tudo o que não é dígito
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos
      .replace(/(\d{3})(\d)/, '$1.$2') // Coloca um ponto entre o terceiro e o quarto dígitos de novo (para o segundo bloco de números)
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') // Coloca um hífen entre o terceiro e o quarto dígitos
      .slice(0, 14); // Limita o tamanho
  };

  const mascaraTelefone = (v) => {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const mascaraCEP = (v) => {
    return v
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
  };
  
  const ocultarCPF = (cpf) => {
    if (!cpf) return "---";
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length < 11) return cpf;
    return `***.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-**`;
  };

  const calcularIdade = (dataNasc) => {
    if (!dataNasc) return '-';
    const nasc = new Date(dataNasc);
    const hojeDate = new Date();
    let idade = hojeDate.getFullYear() - nasc.getFullYear();
    const m = hojeDate.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hojeDate.getDate() < nasc.getDate())) idade--;
    return idade;
  };

  const handleChange = (e) => {
    let { name, value, type, checked } = e.target;
    
    // Tratamento específico para campos mascarados
    if (name === 'cpf') value = mascaraCPF(value);
    if (name === 'telefone') value = mascaraTelefone(value);
    if (name === 'cep') value = mascaraCEP(value);
    
    // Validação de ano de nascimento
    if (name === 'data_nascimento') {
        const partes = value.split('-');
        if (partes[0] && partes[0].length > 4) return; // Impede anos com 5 dígitos
    }

    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // --- API ---
  const fetchPacientes = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const { data } = await api.get(`pacientes/?page=${page}&search=${search}`);
      setPacientes(data.results || []);
      setTotalPages(Math.ceil(data.count / 15));
    } catch (error) {
      notify.error("Erro ao carregar lista de pacientes.");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPacientes(); }, [page, search, api]);

  const buscarCep = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm(prev => ({ ...prev, logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf }));
        notify.success("Endereço preenchido!");
      } else { notify.warning("CEP não encontrado."); }
    } catch { notify.error("Erro ao buscar CEP."); } 
    finally { setLoadingCep(false); }
  };

  const handleExcluir = async (id) => {
    const confirmado = await confirmDialog(
      "Esta ação apagará permanentemente os dados do titular. Prosseguir?", 
      "Excluir Paciente", "Confirmar Exclusão", "Cancelar", "danger"
    );
    if (confirmado) {
      try { 
        await api.delete(`pacientes/${id}/`); 
        notify.success("Paciente removido.");
        fetchPacientes(); 
      } catch (e) { notify.error("Erro ao excluir. Verifique se há agendamentos vinculados."); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.aceite_lgpd) return notify.warning("O aceite do Termo de Privacidade é obrigatório.");
    if (form.data_nascimento > hoje) return notify.warning("Data de nascimento inválida.");

    // Limpa máscaras antes de enviar (opcional, dependendo do backend)
    // const payload = { ...form, cpf: form.cpf.replace(/\D/g, ''), telefone: form.telefone.replace(/\D/g, ''), cep: form.cep.replace(/\D/g, '') };
    const payload = form; // Enviando com máscara se o backend aceitar, senão descomente a linha acima

    try {
      if (editandoId) {
        await api.put(`pacientes/${editandoId}/`, payload);
        notify.success("Cadastro atualizado!");
      } else {
        await api.post('pacientes/', payload);
        notify.success("Paciente cadastrado com sucesso!");
      }
      setViewMode('list');
      fetchPacientes();
    } catch (error) { 
        if (error.response?.data?.cpf) notify.warning("Este CPF já está em uso.");
        else notify.error("Erro ao salvar cadastro."); 
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold";
  const labelClass = "block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-widest";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20 tracking-tight">
        {viewMode === 'list' ? (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Gestão de Pacientes</h1>
              <button onClick={() => {setForm(formInicial); setEditandoId(null); setViewMode('form');}} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 flex items-center gap-2 active:scale-95 transition-all">
                <UserPlus size={18}/> Incluir Paciente
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 relative">
                <label className={labelClass}>Localizar na Base de Dados</label>
                <div className="relative">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input 
                        placeholder="Pesquisar por nome ou CPF..." 
                        value={search} 
                        onChange={e => { setSearch(e.target.value); setPage(1); }} 
                        className={`${inputClass} pl-12`}
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 font-black text-[10px] uppercase tracking-widest border-b dark:border-slate-700">
                  <tr>
                    <th className="px-8 py-5">Identificação</th>
                    <th className="px-8 py-5">CPF (Privacidade)</th>
                    <th className="px-8 py-5">Contato</th>
                    <th className="px-8 py-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {loading ? (
                    <tr><td colSpan="4" className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-blue-600" size={40}/></td></tr>
                  ) : pacientes.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <span className="font-black text-slate-800 dark:text-white uppercase text-sm">{p.nome}</span>
                           {p.prioridade && PRIORIDADES[p.prioridade] && (
                               <span className={`${PRIORIDADES[p.prioridade].color} p-1.5 bg-current/10 rounded-lg`} title={PRIORIDADES[p.prioridade].label}>
                                   {PRIORIDADES[p.prioridade].icon}
                               </span>
                           )}
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                            {calcularIdade(p.data_nascimento)} anos • {p.sexo || 'Não informado'}
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-slate-500 dark:text-slate-400 font-bold">
                        <div className="flex items-center gap-3">
                            {verCpfs[p.id] ? p.cpf : ocultarCPF(p.cpf)}
                            <button onClick={() => setVerCpfs(prev => ({...prev, [p.id]: !prev[p.id]}))} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors text-slate-400">
                                {verCpfs[p.id] ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-slate-600 dark:text-slate-300 font-medium">
                        {p.telefone || '---'}
                      </td>
                      <td className="px-8 py-6 text-right">
                        {/* CORREÇÃO: Botões de ação sempre visíveis, removido opacity-0 */}
                        <div className="flex justify-end gap-2">
                          <button onClick={() => {setForm({ ...formInicial, ...p, aceite_lgpd: !!p.aceite_lgpd }); setEditandoId(p.id); setViewMode('form');}} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Editar"><Pencil size={18} /></button>
                          <button onClick={() => handleExcluir(p.id)} className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Remover"><Trash2 size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Paginação */}
              {totalPages > 1 && (
                  <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 flex justify-between items-center">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"><ChevronLeft size={20}/></button>
                      <span className="text-xs font-black uppercase text-slate-400 tracking-widest">Página {page} de {totalPages}</span>
                      <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="p-2 disabled:opacity-30 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-all"><ChevronRight size={20}/></button>
                  </div>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-500">
            <button onClick={() => setViewMode('list')} className="mb-8 flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                <ArrowLeft size={16}/> Voltar para listagem
            </button>
            <div className="bg-white dark:bg-slate-800 rounded-[40px] shadow-2xl border border-slate-200 dark:border-slate-700 p-12">
              <h2 className="text-3xl font-black mb-10 text-slate-800 dark:text-white uppercase tracking-tighter flex items-center gap-4">
                  {editandoId ? 'Editar Cadastro' : 'Novo Paciente'}
                  <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full tracking-widest font-black uppercase">Seguro LGPD</span>
              </h2>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8">
                <div className="md:col-span-12 border-b dark:border-slate-700 pb-3 mb-2 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2"><User size={16}/> Dados Identificadores</div>
                
                <div className="md:col-span-6"><label className={labelClass}>Nome Completo</label><input name="nome" value={form.nome} onChange={handleChange} className={inputClass} required /></div>
                <div className="md:col-span-3"><label className={labelClass}>CPF do Paciente</label><input name="cpf" value={form.cpf} onChange={handleChange} className={inputClass} required placeholder="000.000.000-00"/></div>
                <div className="md:col-span-3">
                    <label className={labelClass}>Acessibilidade</label>
                    <select name="prioridade" value={form.prioridade} onChange={handleChange} className={inputClass}>
                        <option value="">Nenhuma (Padrão)</option>
                        {Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>

                <div className="md:col-span-3"><label className={labelClass}>Nascimento</label><input type="date" name="data_nascimento" value={form.data_nascimento} onChange={handleChange} max={hoje} className={inputClass} required /></div>
                <div className="md:col-span-3"><label className={labelClass}>Sexo</label><select name="sexo" value={form.sexo} onChange={handleChange} className={inputClass}><option value="">Selecione...</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Outro">Outro</option></select></div>
                <div className="md:col-span-3"><label className={labelClass}>Telefone / WhatsApp</label><input name="telefone" value={form.telefone} onChange={handleChange} className={inputClass} placeholder="(00) 00000-0000"/></div>
                <div className="md:col-span-3"><label className={labelClass}>Nome da Mãe</label><input name="nome_mae" value={form.nome_mae} onChange={handleChange} className={inputClass} /></div>

                <div className="md:col-span-12 border-b dark:border-slate-700 pb-3 mb-2 font-black text-slate-400 uppercase text-[10px] tracking-[0.2em] flex items-center gap-2 mt-6"><MapPin size={16}/> Localização Residencial</div>
                
                <div className="md:col-span-3"><label className={labelClass}>CEP {loadingCep && <Loader2 size={12} className="inline animate-spin ml-1 text-blue-500"/>}</label><input name="cep" value={form.cep} onChange={handleChange} onBlur={buscarCep} className={inputClass} placeholder="00000-000"/></div>
                <div className="md:col-span-7"><label className={labelClass}>Logradouro</label><input name="logradouro" value={form.logradouro} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-2"><label className={labelClass}>Nº</label><input name="numero" value={form.numero} onChange={handleChange} className={inputClass} /></div>

                <div className="md:col-span-4"><label className={labelClass}>Complemento</label><input name="complemento" value={form.complemento} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-4"><label className={labelClass}>Bairro</label><input name="bairro" value={form.bairro} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-4"><label className={labelClass}>Cidade</label><input name="cidade" value={form.cidade} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-4"><label className={labelClass}>UF</label><input name="estado" value={form.estado} onChange={handleChange} className={inputClass} maxLength={2} style={{textTransform:'uppercase'}}/></div>

                <div className="md:col-span-12 mt-8">
                    <div className={`p-6 rounded-[24px] border-2 transition-all ${form.aceite_lgpd ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20' : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50'}`}>
                        <label className="flex items-start gap-4 cursor-pointer">
                            <input type="checkbox" name="aceite_lgpd" checked={form.aceite_lgpd} onChange={handleChange} className="mt-1.5 w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500 border-slate-300"/>
                            <div>
                                <span className="block text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Consentimento LGPD</span>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">
                                    Ao marcar este item, o titular autoriza o processamento de seus dados pessoais e sensíveis para fins exclusivos de assistência à saúde e faturamento médico, nos termos da Lei 13.709/2018.
                                </p>
                            </div>
                        </label>
                    </div>
                </div>

                <div className="md:col-span-12 flex justify-end mt-10 gap-4 border-t dark:border-slate-700 pt-10">
                  <button type="button" onClick={() => setViewMode('list')} className="px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-200 transition-all">Cancelar</button>
                  <button className="bg-slate-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-[0.2em] px-12 py-4 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-3">
                    <ShieldCheck size={18} /> Salvar e Validar Consentimento
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
