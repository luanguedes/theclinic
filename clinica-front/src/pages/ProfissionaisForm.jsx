import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Plus, Trash2, BriefcaseMedical, ChevronDown, Check, X } from 'lucide-react';

// --- COMPONENTE DE SELEÇÃO PESQUISÁVEL OTIMIZADO ---
const SearchableSelect = ({ options, value, onChange, placeholder, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);

    // Sincroniza o texto do input com o valor selecionado
    useEffect(() => { 
        const selected = options.find(o => String(o.id) === String(value)); 
        if (selected) setQuery(selected.label);
        else if (!value) setQuery('');
    }, [value, options]);

    // Fecha ao clicar fora
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

    // Filtra na lista COMPLETA
    const filtered = (query === '' || (options.find(o => o.label === query))) 
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
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <input 
                    type="text" 
                    required={required && !value} 
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 pr-10 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white cursor-pointer" 
                    value={query} 
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                    onChange={e => { setQuery(e.target.value); setIsOpen(true); if(e.target.value === '') onChange(''); }} 
                    placeholder={placeholder} 
                    autoComplete="off"
                />
                <div className="absolute right-2 top-2.5 flex items-center gap-1 text-slate-400">
                    {value && (
                        <button type="button" onClick={handleClear} className="hover:text-red-500 p-0.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X size={14}/></button>
                    )}
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            {isOpen && (
                <ul className="absolute z-[100] w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-2xl max-h-60 overflow-auto mt-1 animate-in fade-in zoom-in duration-100">
                    {/* OTIMIZAÇÃO: Mostra apenas os top 50 resultados para não travar a tela, mas filtra na lista inteira */}
                    {filtered.slice(0, 50).map(opt => (
                        <li key={opt.id} onMouseDown={() => handleSelect(opt.id, opt.label)} className={`p-2.5 cursor-pointer text-sm border-b last:border-0 border-slate-100 dark:border-slate-700 flex justify-between items-center transition-colors ${String(value) === String(opt.id) ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'}`}>
                            {opt.label}
                            {String(value) === String(opt.id) && <Check size={14}/>}
                        </li>
                    ))}
                    {filtered.length === 0 && <li className="p-3 text-sm text-slate-400 text-center">Nenhum resultado.</li>}
                    {filtered.length > 50 && <li className="p-2 text-xs text-slate-400 text-center bg-slate-50 dark:bg-slate-900">...e mais {filtered.length - 50} resultados. Continue digitando.</li>}
                </ul>
            )}
        </div>
    );
};

export default function ProfissionalForm() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const [formData, setFormData] = useState({ nome: '', cpf: '', data_nascimento: '' });
  
  const [items, setItems] = useState([]); 
  const [listaEspecialidades, setListaEspecialidades] = useState([]);
  const [loading, setLoading] = useState(false);

  // --- MÁSCARA DE CPF PARA INPUT ---
  const mascaraCPF = (value) => {
    return value
      .replace(/\D/g, '') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d)/, '$1.$2') 
      .replace(/(\d{3})(\d{1,2})/, '$1-$2') 
      .replace(/(-\d{2})\d+?$/, '$1'); 
  };

  useEffect(() => {
    if(api) {
        // Traz TODAS as especialidades (nopage=true)
        api.get('especialidades/?nopage=true').then(res => setListaEspecialidades(res.data.results || res.data));
        
        if (id) {
            api.get(`profissionais/${id}/`).then(res => {
                setFormData({ nome: res.data.nome, cpf: res.data.cpf, data_nascimento: res.data.data_nascimento });
                setItems(res.data.especialidades);
            });
        }
    }
  }, [id, api]);

  const handleAddItem = () => {
    // ALTERAÇÃO: UF padrão agora é 'PR'
    setItems([...items, { especialidade_id: '', sigla_conselho: '', registro_conselho: '', uf_conselho: 'PR' }]);
  };

  const handleRemoveItem = (index) => setItems(items.filter((_, i) => i !== index));
  
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const cpfLimpo = formData.cpf.replace(/\D/g, ''); 
    const payload = { ...formData, cpf: cpfLimpo, especialidades: items };
    
    try {
        if(id) await api.put(`profissionais/${id}/`, payload);
        else await api.post('profissionais/', payload);
        alert('Salvo com sucesso!');
        navigate('/profissionais');
    } catch (e) { alert('Erro ao salvar.'); }
    finally { setLoading(false); }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm";
  const labelClass = "block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1";
  const subLabelClass = "text-xs text-slate-500 mb-1 block";

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-10">
        <button 
            onClick={()=>navigate('/profissionais')} 
            className="mb-4 flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 px-3 py-2 rounded-lg transition-colors"
        >
            <ArrowLeft size={18}/> Voltar
        </button>

        <h1 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white">{id ? 'Editar' : 'Novo'} Profissional</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Dados Pessoais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className={labelClass}>Nome Completo</label>
                        <input required value={formData.nome} onChange={e=>setFormData({...formData, nome:e.target.value})} className={inputClass}/>
                    </div>
                    <div>
                        <label className={labelClass}>CPF</label>
                        <input 
                            required 
                            placeholder="000.000.000-00" 
                            value={formData.cpf} 
                            onChange={e => setFormData({ ...formData, cpf: mascaraCPF(e.target.value) })} 
                            className={inputClass}
                            maxLength={14}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Data Nascimento</label>
                        <input required type="date" value={formData.data_nascimento} onChange={e=>setFormData({...formData, data_nascimento:e.target.value})} className={inputClass}/>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><BriefcaseMedical size={20}/> Especialidades e Conselhos</h2>
                    
                    <button 
                        type="button" 
                        onClick={handleAddItem} 
                        className="text-sm font-bold text-blue-600 flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-2 rounded-lg transition-colors bg-transparent"
                    >
                        <Plus size={16}/> Adicionar Especialidade
                    </button>
                </div>

                {items.length === 0 && <div className="text-center p-4 text-slate-400 border border-dashed rounded-lg">Nenhuma especialidade vinculada. Clique em Adicionar.</div>}

                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="flex flex-col md:flex-row gap-3 items-end bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
                            
                            <div className="flex-[2] w-full min-w-[200px]">
                                <label className={subLabelClass}>Especialidade</label>
                                <SearchableSelect
                                    options={listaEspecialidades.map(e => ({ id: e.id, label: e.nome }))}
                                    value={item.especialidade_id}
                                    onChange={(val) => handleItemChange(index, 'especialidade_id', val)}
                                    placeholder="Digite para buscar..."
                                    required={true}
                                />
                            </div>

                            <div className="flex-1 w-full min-w-[100px]">
                                <label className={subLabelClass}>Sigla Conselho</label>
                                <input required value={item.sigla_conselho} onChange={e=>handleItemChange(index, 'sigla_conselho', e.target.value)} className={inputClass} placeholder="Ex: CRM" style={{textTransform: 'uppercase'}}/>
                            </div>

                            <div className="flex-1 w-full min-w-[120px]">
                                <label className={subLabelClass}>Nº Registro</label>
                                <input required value={item.registro_conselho} onChange={e=>handleItemChange(index, 'registro_conselho', e.target.value)} className={inputClass} placeholder="123456"/>
                            </div>

                            <div className="w-full md:w-20">
                                <label className={subLabelClass}>UF</label>
                                <input required value={item.uf_conselho} onChange={e=>handleItemChange(index, 'uf_conselho', e.target.value)} className={inputClass} placeholder="PR" maxLength={2} style={{textTransform: 'uppercase'}}/>
                            </div>

                            <button type="button" onClick={()=>handleRemoveItem(index)} className="p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors bg-transparent" title="Remover">
                                <Trash2 size={18}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end">
                <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
                    {loading ? 'Salvando...' : <><Save size={20}/> Salvar Profissional</>}
                </button>
            </div>
        </form>
      </div>
    </Layout>
  );
}