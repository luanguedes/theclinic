import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import useUnsavedChanges from '../hooks/useUnsavedChanges';
import { 
    User, Save, ArrowLeft, Plus, Trash2, 
    BriefcaseMedical, ChevronDown, Check, X, Loader2, Award 
} from 'lucide-react';

const SearchableSelect = ({ options, value, onChange, placeholder, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);

    // Atualiza o texto quando o valor externo muda
    useEffect(() => { 
        if (!value) {
            setQuery('');
            return;
        }
        // Força comparação de strings para evitar erros de tipo (number vs string)
        const selected = options.find(o => String(o.id) === String(value)); 
        if (selected) setQuery(selected.label);
    }, [value, options]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                // Se fechou sem selecionar, restaura o texto do valor atual
                const selected = options.find(o => String(o.id) === String(value));
                setQuery(selected ? selected.label : '');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [containerRef, value, options]);

    const filtered = (query === '' || (options.find(o => o.label === query))) 
        ? options 
        : options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));
    
    const handleSelect = (id, label) => {
        onChange(id);
        setQuery(label);
        setIsOpen(false);
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input 
                    type="text" 
                    required={required && !value} 
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white cursor-pointer font-bold" 
                    value={query} 
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); if(e.target.value === '') onChange(''); }} 
                    placeholder={placeholder} 
                    autoComplete="off"
                />
                <div className="absolute right-2 top-2.5 flex items-center gap-1 text-slate-400">
                    {value && <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }} className="hover:text-red-500 p-0.5"><X size={14}/></button>}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            {isOpen && (
                <ul className="absolute z-[100] w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-auto mt-1 animate-in fade-in zoom-in duration-100">
                    {filtered.map(opt => (
                        <li key={opt.id} onMouseDown={() => handleSelect(opt.id, opt.label)} className={`p-2.5 cursor-pointer text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors ${String(value) === String(opt.id) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 font-bold' : 'hover:bg-slate-50'}`}>
                            {opt.label} {String(value) === String(opt.id) && <Check size={14}/>}
                        </li>
                    ))}
                    {filtered.length === 0 && <li className="p-3 text-sm text-slate-400 text-center">Nenhum resultado.</li>}
                </ul>
            )}
        </div>
    );
};

export default function ProfissionalForm() {
  const { api } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({ nome: '', cpf: '', data_nascimento: '' });
  const [items, setItems] = useState([]); 
  const [listaEspecialidades, setListaEspecialidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const initialSnapshotRef = useRef(null);

  const hoje = new Date().toISOString().split('T')[0];

  const mascaraCPF = (value) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);

  useEffect(() => {
    if(api) {
        setFetching(true);
        // Carrega especialidades para o Select
        api.get('especialidades/?nopage=true') 
            .then(res => setListaEspecialidades(res.data.results || res.data))
            .catch(() => notify.error("Erro ao carregar lista de especialidades."));
        
        if (id) {
            api.get(`profissionais/${id}/`).then(res => {
                const nextForm = { 
                    nome: res.data.nome, 
                    cpf: res.data.cpf, 
                    data_nascimento: res.data.data_nascimento
                };
                setFormData(nextForm);
                
                // --- CORRE????O: MAPEAMENTO EXATO COM SEU SERIALIZER ---
                const vinculos = (res.data.especialidades || []).map(v => ({
                    // 'especialidade_leitura' ? o campo ReadOnly que criamos no serializer 
                    // para garantir que o ID venha limpo do backend.
                    especialidade_id: v.especialidade_leitura, 
                    sigla_conselho: v.sigla_conselho || '',
                    registro_conselho: v.registro_conselho || '',
                    uf_conselho: v.uf_conselho || 'PR'
                }));
                
                setItems(vinculos);
                initialSnapshotRef.current = JSON.stringify({ formData: nextForm, items: vinculos });
            }).catch((err) => {
                console.error(err);
                notify.error("Erro ao carregar dados.");
            })
            .finally(() => setFetching(false));
        } else { setFetching(false); }
    }
  }, [id, api]);

  useEffect(() => {
    if (id) return;
    if (initialSnapshotRef.current === null) {
      initialSnapshotRef.current = JSON.stringify({ formData, items });
    }
  }, [id]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'data_nascimento' && value.split('-')[0].length > 4) return;
    if (name === 'cpf') value = mascaraCPF(value);
    setFormData({ ...formData, [name]: value });
  };

  const handleAddItem = () => {
    setItems([...items, { especialidade_id: '', sigla_conselho: '', registro_conselho: '', uf_conselho: 'PR' }]);
  };

  const handleRemoveItem = async (index) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.data_nascimento > hoje) return notify.warning("Data de nascimento inválida.");
    if (items.length === 0) return notify.warning("Vincule ao menos uma especialidade.");
    if (items.some(i => !i.especialidade_id)) return notify.warning("Selecione a especialidade em todas as linhas.");

    setLoading(true);
    const cpfLimpo = formData.cpf.replace(/\D/g, ''); 
    const payload = { 
        ...formData, 
        cpf: cpfLimpo, 
        especialidades: items // O Serializer espera 'especialidades' que contém 'especialidade_id'
    };
    
    try {
        if(id) await api.put(`profissionais/${id}/`, payload);
        else await api.post('profissionais/', payload);
        notify.success("Salvo com sucesso!");
        navigate('/profissionais');
    } catch (err) { 
        if(err.response?.data?.cpf) notify.warning("CPF já cadastrado.");
        else {
            console.error(err);
            notify.error('Erro ao salvar. Verifique os campos.'); 
        }
    } finally { setLoading(false); }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all font-bold";
  const subLabelClass = "text-[10px] font-black text-slate-400 mb-1 block uppercase tracking-widest";
  const isDirty = initialSnapshotRef.current && JSON.stringify({ formData, items }) !== initialSnapshotRef.current;
  useUnsavedChanges(isDirty && !loading && !fetching);

  if (fetching) return <Layout><div className="h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20">
        <button onClick={()=>navigate('/profissionais')} className="mb-4 flex items-center gap-2 text-slate-500 hover:text-blue-600 bg-transparent hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors font-bold text-sm"><ArrowLeft size={18}/> Voltar</button>
        <h1 className="text-2xl font-black mb-6 text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">{id ? 'Editar Profissional' : 'Novo Profissional'}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="font-black text-sm uppercase tracking-widest mb-6 text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center gap-2"><User size={18} className="text-blue-500"/> Dados Cadastrais</h2>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-6"><label className={subLabelClass}>Nome Completo</label><input required value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} className={inputClass} placeholder="Nome do médico"/></div>
                    <div className="md:col-span-3"><label className={subLabelClass}>CPF</label><input required placeholder="000.000.000-00" value={formData.cpf} onChange={handleChange} name="cpf" className={inputClass} maxLength={14}/></div>
                    <div className="md:col-span-3"><label className={subLabelClass}>Nascimento</label><input required type="date" name="data_nascimento" max={hoje} value={formData.data_nascimento} onChange={handleChange} className={inputClass}/></div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-6 border-b pb-2 dark:border-slate-700">
                    <h2 className="font-black text-sm uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-2"><BriefcaseMedical size={18} className="text-pink-600"/> Vínculos e Conselhos</h2>
                    <button type="button" onClick={handleAddItem} className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-1 hover:bg-blue-50 px-4 py-2 rounded-xl transition-colors bg-blue-50"><Plus size={16}/> Adicionar Especialidade</button>
                </div>

                {items.length === 0 && <div className="text-center py-12 px-4 text-slate-400 border-2 border-dashed rounded-2xl bg-slate-50/50"><Award size={32} className="mx-auto mb-2 opacity-50"/><span className="font-bold text-xs uppercase">Nenhuma especialidade vinculada</span></div>}

                <div className="space-y-4">
                    {items.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex-[2] w-full min-w-[200px]"><label className={subLabelClass}>Especialidade</label><SearchableSelect options={listaEspecialidades.map(e => ({ id: e.id, label: e.nome }))} value={item.especialidade_id} onChange={(val) => handleItemChange(index, 'especialidade_id', val)} placeholder="Selecione..." required={true} /></div>
                            <div className="flex-1 w-full min-w-[100px]"><label className={subLabelClass}>Conselho</label><input required value={item.sigla_conselho} onChange={e=>handleItemChange(index, 'sigla_conselho', e.target.value)} className={inputClass} placeholder="CRM/CRO" style={{textTransform: 'uppercase'}}/></div>
                            <div className="flex-1 w-full min-w-[120px]"><label className={subLabelClass}>Nº Registro</label><input required value={item.registro_conselho} onChange={e=>handleItemChange(index, 'registro_conselho', e.target.value)} className={inputClass} placeholder="000000"/></div>
                            <div className="w-full md:w-24"><label className={subLabelClass}>UF</label><input required value={item.uf_conselho} onChange={e=>handleItemChange(index, 'uf_conselho', e.target.value)} className={inputClass} placeholder="UF" maxLength={2} style={{textTransform: 'uppercase'}}/></div>
                            <button type="button" onClick={()=>handleRemoveItem(index)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors bg-white border border-slate-200 shadow-sm"><Trash2 size={20}/></button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-6">
                <button type="button" onClick={() => navigate('/profissionais')} className="px-8 py-4 text-slate-500 font-black uppercase text-xs tracking-widest hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl active:scale-95 transition-all disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={20}/> : <><Save size={20}/> Salvar Dados</>}</button>
            </div>
        </form>
      </div>
    </Layout>
  );
}
