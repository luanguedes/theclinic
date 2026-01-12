import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Layout from '../components/Layout';
import { Building, Save, MapPin, Info, Loader2, Upload, Image as ImageIcon, X } from 'lucide-react';

export default function DadosClinica() {
  const { api } = useAuth();
  const { notify } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [loadingCep, setLoadingCep] = useState(false);
  
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [form, setForm] = useState({
    nome_fantasia: '', 
    razao_social: '', 
    cnpj: '', 
    email: '', 
    telefone: '',
    logradouro: '', numero: '', complemento: '', 
    bairro: '', cidade: '', estado: '', cep: ''
  });

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
          razao_social: dados.razao_social || '',
          cnpj: dados.cnpj ? mascaraCNPJ(dados.cnpj) : '',
          telefone: dados.telefone ? mascaraTelefone(dados.telefone) : '',
          cep: dados.cep ? mascaraCEP(dados.cep) : ''
        });
        
        if (dados.logo) {
            setLogoPreview(dados.logo); 
        }
      } catch (e) {
        notify.error("Erro ao carregar os dados da clínica.");
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
          logradouro: data.logradouro, 
          bairro: data.bairro, 
          cidade: data.localidade, 
          estado: data.uf
        }));
        notify.success("Endereço preenchido via CEP.");
        document.getElementById('numero_clinica')?.focus();
      } else {
        notify.warning("CEP não encontrado.");
      }
    } catch (error) { 
        notify.error("Erro ao consultar serviço de CEP."); 
    } finally { setLoadingCep(false); }
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
          if (file.size > 2 * 1024 * 1024) { // 2MB Limit
              return notify.warning("A imagem deve ter no máximo 2MB.");
          }
          setLogoFile(file);
          setLogoPreview(URL.createObjectURL(file));
      }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome_fantasia) return notify.warning("O Nome Fantasia é obrigatório.");

    setLoading(true);
    try {
      const formData = new FormData();
      
      Object.keys(form).forEach(key => {
          let val = form[key];
          // Limpa máscaras antes de enviar
          if (['cnpj', 'telefone', 'cep'].includes(key)) {
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
      
      notify.success("Dados da clínica atualizados com sucesso!");
    } catch (e) {
      notify.error("Erro ao salvar alterações. Verifique os dados inseridos.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-all";
  const labelClass = "block text-sm font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-tight";

  if (fetching) return (
    <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
            <Loader2 className="animate-spin text-blue-600 mb-4" size={40}/>
            <span className="font-bold uppercase tracking-widest text-xs">Carregando dados da clínica...</span>
        </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto pb-20">
        <div className="flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/20">
                <Building className="text-white" size={24}/>
            </div>
            <div>
                <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Dados da Clínica</h1>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Informações institucionais e identidade visual</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SEÇÃO DO LOGO */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700">
             <h2 className="text-sm font-black mb-6 flex items-center gap-2 border-b pb-3 dark:border-slate-700 uppercase tracking-widest text-slate-400">
                <ImageIcon size={18} className="text-purple-500"/> Logotipo da Clínica
            </h2>
            <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-40 h-40 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden relative shadow-inner">
                    {logoPreview ? (
                        <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain p-4 transition-transform hover:scale-110" />
                    ) : (
                        <div className="flex flex-col items-center gap-2 opacity-30">
                            <ImageIcon size={32}/>
                            <span className="text-[10px] font-bold uppercase">Sem Logo</span>
                        </div>
                    )}
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-slate-800 dark:text-white font-bold mb-1">Alterar Logotipo</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-medium">Recomendado: Imagens em PNG com fundo transparente.</p>
                    
                    <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95">
                        <Upload size={16}/> Escolher Imagem
                        <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                </div>
            </div>
          </div>

          {/* INFORMAÇÕES GERAIS */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-black mb-6 flex items-center gap-2 border-b pb-3 dark:border-slate-700 uppercase tracking-widest text-slate-400">
                <Info size={18} className="text-blue-500"/> Informações Gerais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="md:col-span-2">
                <label className={labelClass}>Razão Social</label>
                <input name="razao_social" value={form.razao_social} onChange={handleChange} className={inputClass} placeholder="Ex: Clínica Médica TheClinic Ltda."/>
              </div>

              <div className="md:col-span-2">
                <label className={labelClass}>Nome Fantasia</label>
                <input name="nome_fantasia" required value={form.nome_fantasia} onChange={handleChange} className={inputClass} placeholder="Ex: TheClinic - Unidade Matriz"/>
              </div>
              
              <div>
                <label className={labelClass}>CNPJ</label>
                <input name="cnpj" value={form.cnpj} onChange={handleChange} className={inputClass} placeholder="00.000.000/0000-00"/>
              </div>
              <div>
                <label className={labelClass}>Telefone para Contato</label>
                <input name="telefone" value={form.telefone} onChange={handleChange} className={inputClass} placeholder="(00) 00000-0000" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>E-mail Institucional</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="contato@theclinic.com.br" />
              </div>
            </div>
          </div>

          {/* ENDEREÇO */}
          <div className="bg-white dark:bg-slate-800 p-8 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-sm font-black mb-6 flex items-center gap-2 border-b pb-3 dark:border-slate-700 uppercase tracking-widest text-slate-400">
                <MapPin size={18} className="text-red-500"/> Localização e Endereço
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-1">
                <label className={labelClass}>CEP {loadingCep && <Loader2 size={12} className="inline animate-spin ml-1 text-blue-500"/>}</label>
                <input name="cep" value={form.cep} onChange={handleChange} onBlur={buscarCep} className={inputClass} placeholder="00000-000" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Logradouro</label>
                <input name="logradouro" value={form.logradouro} onChange={handleChange} className={inputClass} placeholder="Rua, Avenida..."/>
              </div>
              <div className="md:col-span-1">
                <label className={labelClass}>Número</label>
                <input id="numero_clinica" name="numero" value={form.numero} onChange={handleChange} className={inputClass} placeholder="123" />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Complemento</label>
                <input name="complemento" value={form.complemento || ''} onChange={handleChange} className={inputClass} placeholder="Apto, Sala, Bloco..." />
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
                <input name="estado" maxLength="2" value={form.estado} onChange={handleChange} className={inputClass} style={{textTransform: 'uppercase'}} placeholder="PR" />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.1em] flex items-center gap-3 shadow-xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 size={20} className="animate-spin"/> : <Save size={20}/>}
              {loading ? 'Sincronizando...' : 'Gravar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}