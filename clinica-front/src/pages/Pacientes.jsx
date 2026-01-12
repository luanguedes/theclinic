import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  Search, UserPlus, MapPin, Pencil, Trash2, Save, ArrowLeft, ChevronLeft, ChevronRight, Loader2, User, Heart, Accessibility, Users, Baby
} from 'lucide-react';
import Layout from '../components/Layout';

// Dicionário para ícones e cores de prioridade
const PRIORIDADES = {
    'idoso': { label: 'Idoso (60+)', icon: <Users size={14} />, color: 'text-amber-500' },
    'gestante': { label: 'Gestante', icon: <Baby size={14} />, color: 'text-pink-500' },
    'cadeirante': { label: 'Cadeirante', icon: <Accessibility size={14} />, color: 'text-blue-500' },
    'autista': { label: 'TEA (Autismo)', icon: <Heart size={14} />, color: 'text-teal-500' },
    'pcd': { label: 'PCD', icon: <Accessibility size={14} />, color: 'text-purple-500' },
};

export default function Pacientes() {
  const { api } = useAuth();
  const { notify, confirmDialog } = useNotification();
  
  const [viewMode, setViewMode] = useState('list');
  const [editandoId, setEditandoId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  const [pacientes, setPacientes] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const formInicial = {
    nome: '', nome_mae: '', sexo: '', cpf: '', data_nascimento: '', telefone: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    prioridade: ''
  };
  const [form, setForm] = useState(formInicial);

  const hoje = new Date().toISOString().split('T')[0];

  const mascaraCPF = (v) => v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);
  const mascaraTelefone = (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
  const mascaraCEP = (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === 'data_nascimento') {
        const partes = value.split('-');
        if (partes[0] && partes[0].length > 4) return;
    }

    if (name === 'cpf') value = mascaraCPF(value);
    if (name === 'telefone') value = mascaraTelefone(value);
    if (name === 'cep') value = mascaraCEP(value);
    
    setForm({ ...form, [name]: value });
  };

  const fetchPacientes = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const { data } = await api.get(`pacientes/?page=${page}&search=${search}`);
      setPacientes(data.results || []);
      setTotalPages(Math.ceil(data.count / 15));
    } catch (error) {
      notify.error("Erro ao carregar lista de pacientes.");
    } finally {
      setLoading(false);
    }
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
      } else {
        notify.warning("CEP não encontrado.");
      }
    } catch {
      notify.error("Erro ao buscar CEP.");
    } finally { setLoadingCep(false); }
  };

  const handleExcluir = async (id) => {
    const confirmado = await confirmDialog(
      "Tem certeza que deseja excluir este paciente? Esta ação não pode ser desfeita.", 
      "Excluir Paciente", "Confirmar Exclusão", "Cancelar", "danger"
    );
    if (confirmado) {
      try { 
        await api.delete(`pacientes/${id}/`); 
        notify.success("Paciente removido.");
        fetchPacientes(); 
      } catch (e) { notify.error("Erro ao excluir. Verifique vínculos."); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.data_nascimento > hoje) {
        return notify.warning("A data de nascimento não pode ser futura.");
    }
    const anoNasc = parseInt(form.data_nascimento.split('-')[0]);
    if (anoNasc < 1900) {
        return notify.warning("Por favor, insira um ano de nascimento válido.");
    }

    try {
      if (editandoId) {
        await api.put(`pacientes/${editandoId}/`, form);
        notify.success("Cadastro atualizado!");
      } else {
        await api.post('pacientes/', form);
        notify.success("Paciente cadastrado!");
      }
      setViewMode('list');
      fetchPacientes();
    } catch (error) { 
        if (error.response?.data?.cpf) notify.warning("CPF já cadastrado!");
        else notify.error("Erro ao salvar."); 
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition-colors";
  const labelClass = "block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1";

  return (
    <Layout>
      <div className="max-w-6xl mx-auto pb-20">
        {viewMode === 'list' ? (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Pacientes</h1>
              <button onClick={() => {setForm(formInicial); setEditandoId(null); setViewMode('form');}} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95">
                <UserPlus size={20}/> Incluir Paciente
              </button>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border mb-6 border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <input 
                    placeholder="Pesquisar por nome ou CPF..." 
                    value={search} 
                    onChange={e => { setSearch(e.target.value); setPage(1); }} 
                    className="w-full pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 outline-none text-slate-700 dark:text-white focus:border-blue-500"
                />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider">Nome</th>
                    <th className="px-6 py-4 font-bold uppercase tracking-wider">CPF</th>
                    <th className="px-6 py-4 text-right font-bold uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {loading ? (
                    <tr><td colSpan="3" className="p-8 text-center"><Loader2 className="animate-spin mx-auto"/></td></tr>
                  ) : pacientes.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-slate-700 dark:text-white">{p.nome}</span>
                           {p.prioridade && PRIORIDADES[p.prioridade] && (
                               <span className={PRIORIDADES[p.prioridade].color} title={PRIORIDADES[p.prioridade].label}>
                                   {PRIORIDADES[p.prioridade].icon}
                               </span>
                           )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-mono">{p.cpf}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <button onClick={() => {setForm(p); setEditandoId(p.id); setViewMode('form');}} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><Pencil size={18} /></button>
                        <button onClick={() => handleExcluir(p.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="animate-in slide-in-from-right-4 duration-300">
            <button onClick={() => setViewMode('list')} className="mb-6 flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 transition-colors">
                <ArrowLeft size={18}/> Voltar
            </button>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border p-8 border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold mb-6 text-slate-800 dark:text-white uppercase tracking-tight">
                  {editandoId ? 'Editar Paciente' : 'Novo Paciente'}
              </h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-12 border-b dark:border-slate-700 pb-2 mb-2 font-bold text-slate-700 dark:text-white flex items-center gap-2"><User size={18}/> Dados Pessoais</div>
                
                <div className="md:col-span-6"><label className={labelClass}>Nome Completo</label><input name="nome" value={form.nome} onChange={handleChange} className={inputClass} required /></div>
                <div className="md:col-span-3"><label className={labelClass}>CPF</label><input name="cpf" value={form.cpf} onChange={handleChange} className={inputClass} required placeholder="000.000.000-00"/></div>
                <div className="md:col-span-3">
                    <label className={labelClass}>Prioridade / Acessibilidade</label>
                    <select name="prioridade" value={form.prioridade} onChange={handleChange} className={inputClass}>
                        <option value="">Nenhuma (Normal)</option>
                        <option value="idoso">Idoso (60+)</option>
                        <option value="gestante">Gestante</option>
                        <option value="cadeirante">Cadeirante</option>
                        <option value="autista">Autismo (TEA)</option>
                        <option value="pcd">PCD / Def. Oculta</option>
                    </select>
                </div>

                <div className="md:col-span-3">
                    <label className={labelClass}>Nascimento</label>
                    <input type="date" name="data_nascimento" value={form.data_nascimento} onChange={handleChange} max={hoje} className={inputClass} required />
                </div>
                <div className="md:col-span-3">
                    <label className={labelClass}>Sexo</label>
                    <select name="sexo" value={form.sexo} onChange={handleChange} className={inputClass}>
                        <option value="">Selecione...</option>
                        <option value="Feminino">Feminino</option>
                        <option value="Masculino">Masculino</option>
                        <option value="Outro">Outro</option>
                    </select>
                </div>
                <div className="md:col-span-3"><label className={labelClass}>Telefone</label><input name="telefone" value={form.telefone} onChange={handleChange} className={inputClass} placeholder="(00) 00000-0000"/></div>
                <div className="md:col-span-3"><label className={labelClass}>Nome da Mãe</label><input name="nome_mae" value={form.nome_mae} onChange={handleChange} className={inputClass} /></div>

                <div className="md:col-span-12 border-b dark:border-slate-700 pb-2 mb-2 font-bold text-slate-700 dark:text-white flex items-center gap-2 mt-4"><MapPin size={18}/> Endereço</div>
                
                <div className="md:col-span-3"><label className={labelClass}>CEP {loadingCep && <Loader2 size={12} className="inline animate-spin ml-1 text-blue-500"/>}</label><input name="cep" value={form.cep} onChange={handleChange} onBlur={buscarCep} className={inputClass} placeholder="00000-000"/></div>
                <div className="md:col-span-7"><label className={labelClass}>Logradouro</label><input name="logradouro" value={form.logradouro} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-2"><label className={labelClass}>Número</label><input name="numero" value={form.numero} onChange={handleChange} className={inputClass} /></div>
                
                <div className="md:col-span-4"><label className={labelClass}>Bairro</label><input name="bairro" value={form.bairro} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-4"><label className={labelClass}>Cidade</label><input name="cidade" value={form.cidade} onChange={handleChange} className={inputClass} /></div>
                <div className="md:col-span-4"><label className={labelClass}>UF</label><input name="estado" value={form.estado} onChange={handleChange} className={inputClass} maxLength={2} style={{textTransform:'uppercase'}}/></div>

                <div className="md:col-span-12 flex justify-end mt-6 gap-3 border-t dark:border-slate-700 pt-6">
                  <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 transition-colors">Cancelar</button>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-lg shadow-lg flex items-center gap-2 transition-transform active:scale-95">
                    <Save size={18} /> Salvar Cadastro
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