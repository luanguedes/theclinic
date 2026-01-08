import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { Building, Save, MapPin, Info, Loader2, Upload, Image as ImageIcon } from 'lucide-react';

export default function DadosClinica() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  
  // Estado para o arquivo e preview do logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [form, setForm] = useState({
    nome_fantasia: '', 
    razao_social: '', // <--- CAMPO ADICIONADO NO ESTADO
    cnpj: '', 
    email: '', 
    telefone: '',
    logradouro: '', numero: '', complemento: '', 
    bairro: '', cidade: '', estado: '', cep: ''
  });

  // --- MÁSCARAS ---
  const mascaraCNPJ = (v) => v.replace(/\D/g, '').replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 18);
  const mascaraTelefone = (v) => v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
  const mascaraCEP = (v) => v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('configuracoes/clinica/');
        const dados = res.data;
        setForm({
          ...dados,
          razao_social: dados.razao_social || '', // Garante que não seja null/undefined
          cnpj: dados.cnpj ? mascaraCNPJ(dados.cnpj) : '',
          telefone: dados.telefone ? mascaraTelefone(dados.telefone) : '',
          cep: dados.cep ? mascaraCEP(dados.cep) : ''
        });
        
        if (dados.logo) {
            setLogoPreview(dados.logo); 
        }
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [api]);

  const buscarCep = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();
      if (!data.erro) {
        setForm(prev => ({
          ...prev,
          logradouro: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf
        }));
        document.getElementById('numero_clinica')?.focus();
      }
    } catch (error) { console.error(error); } finally { setLoadingCep(false); }
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'cnpj') value = mascaraCNPJ(value);
    if (name === 'telefone') value = mascaraTelefone(value);
    if (name === 'cep') value = mascaraCEP(value);
    setForm({ ...form, [name]: value });
  };

  const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          setLogoFile(file);
          setLogoPreview(URL.createObjectURL(file));
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      
      Object.keys(form).forEach(key => {
          let val = form[key];
          if (key === 'cnpj' || key === 'telefone' || key === 'cep') {
              val = val ? val.replace(/\D/g, '') : '';
          }
          if(key !== 'logo' && val !== null && val !== undefined) {
              formData.append(key, val);
          }
      });

      if (logoFile) {
          formData.append('logo', logoFile);
      }

      await api.put('configuracoes/clinica/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      alert("Dados atualizados com sucesso!");
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all";
  const labelClass = "block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1";

  if (fetching) return <Layout><div className="text-center p-10 text-slate-400">Carregando dados da clínica...</div></Layout>;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-10">
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg">
                <Building className="text-white" size={24}/>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dados da Clínica</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SEÇÃO DO LOGO */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
             <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                <ImageIcon size={18} className="text-purple-500"/> Logotipo
            </h2>
            <div className="flex items-center gap-6">
                <div className="w-32 h-32 bg-slate-100 dark:bg-slate-900 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden relative">
                    {logoPreview ? (
                        <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                    ) : (
                        <span className="text-xs text-slate-400 text-center px-2">Sem Logo</span>
                    )}
                </div>
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione uma imagem (PNG, JPG)</label>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-lg transition-colors font-bold text-sm">
                        <Upload size={16}/> Escolher Arquivo
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                    <p className="text-xs text-slate-400 mt-2">Recomendado: Imagem quadrada ou retangular transparente.</p>
                </div>
            </div>
          </div>

          {/* INFORMAÇÕES GERAIS */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                <Info size={18} className="text-blue-500"/> Informações Gerais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* --- RAZÃO SOCIAL ADICIONADA AQUI --- */}
              <div className="md:col-span-2">
                <label className={labelClass}>Razão Social</label>
                <input name="razao_social" value={form.razao_social} onChange={handleChange} className={inputClass} placeholder="Ex: Clínica Médica Ltda."/>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Nome Fantasia</label>
                <input name="nome_fantasia" required value={form.nome_fantasia} onChange={handleChange} className={inputClass} placeholder="Ex: TheClinic"/>
              </div>
              
              <div>
                <label className={labelClass}>CNPJ</label>
                <input name="cnpj" value={form.cnpj} onChange={handleChange} className={inputClass} placeholder="00.000.000/0000-00"/>
              </div>
              <div>
                <label className={labelClass}>Telefone</label>
                <input name="telefone" value={form.telefone} onChange={handleChange} className={inputClass} placeholder="(00) 00000-0000" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>E-mail</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                <MapPin size={18} className="text-red-500"/> Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-1">
                <label className={labelClass}>CEP {loadingCep && <Loader2 size={12} className="inline animate-spin ml-1 text-blue-500"/>}</label>
                <input name="cep" value={form.cep} onChange={handleChange} onBlur={buscarCep} className={inputClass} placeholder="00000-000" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Logradouro</label>
                <input name="logradouro" value={form.logradouro} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-1">
                <label className={labelClass}>Número</label>
                <input id="numero_clinica" name="numero" value={form.numero} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Complemento</label>
                <input name="complemento" value={form.complemento || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Bairro</label>
                <input name="bairro" value={form.bairro} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-3">
                <label className={labelClass}>Cidade</label>
                <input name="cidade" value={form.cidade} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-1">
                <label className={labelClass}>UF</label>
                <input name="estado" maxLength="2" value={form.estado} onChange={handleChange} className={inputClass} style={{textTransform: 'uppercase'}} />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>}
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
} 