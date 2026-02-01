import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  FileText,
  User,
  CalendarDays,
  Eye,
  Loader2
} from 'lucide-react';
import { normalizeSearchText } from '../utils/text';

const FilterSearchableSelect = ({ options, value, onChange, placeholder, onEnter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!value) setText('');
    else {
      const found = options.find((o) => String(o.id) === String(value));
      if (found) setText(found.label);
    }
  }, [value, options]);

  const filtered = options.filter((o) => normalizeSearchText(o.label).includes(normalizeSearchText(text)));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        if (value) {
          const found = options.find((o) => String(o.id) === String(value));
          if (found) setText(found.label);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value, options]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length === 1) {
        onChange(filtered[0].id);
        setText(filtered[0].label);
        setIsOpen(false);
        if (onEnter) setTimeout(() => onEnter(), 50);
      } else if (value && onEnter) {
        onEnter();
      }
    }
  };

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <input
        type="text"
        className="w-full h-full pl-3 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-blue-100 transition-all text-sm font-bold"
        placeholder={placeholder}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setIsOpen(true);
          onChange('');
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {isOpen && (
        <ul className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-auto z-50">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <li
                key={opt.id}
                onMouseDown={() => {
                  onChange(opt.id);
                  setText(opt.label);
                  setIsOpen(false);
                }}
                className="px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm dark:text-white flex justify-between font-medium"
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-4 py-2 text-slate-400 text-xs font-bold">Sem resultados</li>
          )}
        </ul>
      )}
    </div>
  );
};

const actionOptions = [
  { value: 'CREATE', label: 'Inclusao' },
  { value: 'UPDATE', label: 'Alteracao' },
  { value: 'DELETE', label: 'Exclusao' },
  { value: 'REPORT_VIEW', label: 'Relatorio' }
];

const actionLabelMap = {
  CREATE: 'Inclusao',
  UPDATE: 'Alteracao',
  DELETE: 'Exclusao',
  REPORT_VIEW: 'Relatorio'
};

const modelLabelMap = {
  'agendas.agendaconfig': 'Configuracao de Horarios',
  'agendamento.agendamento': 'Agendamentos',
  'agendamento.bloqueioagenda': 'Bloqueios de Agenda',
  'pacientes.paciente': 'Pacientes',
  'profissionais.profissional': 'Profissionais',
  'profissionais.especialidade': 'Especialidades',
  'profissionais.profissionalespecialidade': 'Vinculos Profissional/Especialidade',
  'configuracoes.convenio': 'Convenios',
  'configuracoes.dadosclinica': 'Dados da Clinica',
  'configuracoes.configuracaosistema': 'Configuracoes do Sistema',
  'usuarios.operador': 'Operadores',
  'usuarios.privilegio': 'Privilegios',
  'financeiro.fatura': 'Faturas'
};

const fieldLabelsByModel = {
  'agendas.agendaconfig': {
    profissional: 'Profissional',
    especialidade: 'Especialidade',
    convenio: 'Convenio',
    dias_semana: 'Dias da Semana',
    dia_semana: 'Dia da Semana',
    data_inicio: 'Data Inicio',
    data_fim: 'Data Fim',
    hora_inicio: 'Hora Inicio',
    hora_fim: 'Hora Fim',
    intervalo_minutos: 'Intervalo (min)',
    quantidade_atendimentos: 'Vagas',
    tipo: 'Tipo',
    valor: 'Valor',
    situacao: 'Situacao'
  },
  'agendamento.agendamento': {
    profissional: 'Profissional',
    especialidade: 'Especialidade',
    paciente: 'Paciente',
    convenio: 'Convenio',
    enviar_whatsapp: 'Enviar WhatsApp',
    data: 'Data',
    horario: 'Horario',
    is_encaixe: 'Encaixe',
    horario_chegada: 'Chegada',
    inicio_atendimento: 'Inicio Atendimento',
    fim_atendimento: 'Fim Atendimento',
    valor: 'Valor',
    forma_pagamento: 'Forma de Pagamento',
    pago: 'Pago',
    observacoes: 'Observacoes',
    status: 'Status',
    lembrete_enviado: 'Lembrete Enviado',
    bloqueio_origem: 'Bloqueio Origem'
  },
  'agendamento.bloqueioagenda': {
    profissional: 'Profissional',
    data_inicio: 'Data Inicio',
    data_fim: 'Data Fim',
    hora_inicio: 'Hora Inicio',
    hora_fim: 'Hora Fim',
    motivo: 'Motivo',
    observacao: 'Observacao',
    tipo: 'Tipo',
    recorrente: 'Recorrente'
  },
  'pacientes.paciente': {
    nome: 'Nome',
    nome_mae: 'Nome da Mae',
    sexo: 'Sexo',
    prioridade: 'Prioridade',
    cpf: 'CPF',
    data_nascimento: 'Data de Nascimento',
    telefone: 'Telefone',
    cep: 'CEP',
    logradouro: 'Logradouro',
    numero: 'Numero',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    estado: 'Estado',
    aceite_lgpd: 'Aceite LGPD',
    historico_medico: 'Historico Medico',
    criado_em: 'Criado Em',
    atualizado_em: 'Atualizado Em'
  },
  'profissionais.profissional': {
    nome: 'Nome',
    cpf: 'CPF',
    data_nascimento: 'Data de Nascimento',
    created_at: 'Criado Em'
  },
  'profissionais.especialidade': {
    nome: 'Nome'
  },
  'profissionais.profissionalespecialidade': {
    profissional: 'Profissional',
    especialidade: 'Especialidade',
    sigla_conselho: 'Sigla Conselho',
    registro_conselho: 'Registro Conselho',
    uf_conselho: 'UF Conselho'
  },
  'configuracoes.convenio': {
    nome: 'Nome',
    percentual_desconto: 'Percentual de Desconto',
    ativo: 'Ativo'
  },
  'configuracoes.dadosclinica': {
    nome_fantasia: 'Nome Fantasia',
    razao_social: 'Razao Social',
    cnpj: 'CNPJ',
    telefone: 'Telefone',
    email: 'Email',
    logo: 'Logo',
    logradouro: 'Logradouro',
    numero: 'Numero',
    complemento: 'Complemento',
    bairro: 'Bairro',
    cidade: 'Cidade',
    estado: 'Estado',
    cep: 'CEP'
  },
  'configuracoes.configuracaosistema': {
    itens_por_pagina: 'Itens por Pagina',
    modo_manutencao: 'Modo Manutencao',
    max_tentativas_login: 'Max. Tentativas Login',
    tempo_bloqueio_minutos: 'Tempo Bloqueio (min)',
    tempo_sessao_minutos: 'Tempo Sessao (min)',
    janela_agendamento_meses: 'Janela de Agendamento (meses)',
    enviar_whatsapp_global: 'WhatsApp Global',
    enviar_wpp_confirmacao: 'WhatsApp Confirmacao',
    enviar_wpp_bloqueio: 'WhatsApp Bloqueio',
    enviar_wpp_lembrete: 'WhatsApp Lembrete',
    horario_disparo_lembrete: 'Horario Disparo Lembrete',
    data_ultima_execucao_lembrete: 'Ultima Execucao Lembrete'
  },
  'usuarios.operador': {
    username: 'Usuario',
    first_name: 'Nome',
    last_name: 'Sobrenome',
    email: 'Email',
    telefone: 'Telefone',
    profissional: 'Profissional Vinculado',
    acesso_agendamento: 'Acesso Agendamento',
    acesso_atendimento: 'Acesso Atendimento',
    acesso_faturamento: 'Acesso Faturamento',
    acesso_cadastros: 'Acesso Cadastros',
    acesso_configuracoes: 'Acesso Configuracoes',
    acesso_whatsapp: 'Acesso WhatsApp',
    force_password_change: 'Forcar Troca de Senha',
    theme_preference: 'Tema',
    is_active: 'Ativo',
    is_staff: 'Equipe',
    is_superuser: 'Administrador',
    last_login: 'Ultimo Login',
    date_joined: 'Criado Em'
  },
  'usuarios.privilegio': {
    path: 'Path',
    label: 'Label',
    module_key: 'Chave do Modulo',
    module_label: 'Modulo',
    module_order: 'Ordem do Modulo',
    item_order: 'Ordem do Item',
    active: 'Ativo'
  },
  'financeiro.fatura': {
    agendamento: 'Agendamento',
    valor: 'Valor',
    desconto: 'Desconto',
    forma_pagamento: 'Forma de Pagamento',
    pago: 'Pago',
    data_vencimento: 'Data de Vencimento',
    data_pagamento: 'Data de Pagamento',
    criado_em: 'Criado Em',
    atualizado_em: 'Atualizado Em'
  }
};

const getModelKey = (log) => {
  const app = log?.app_label || '';
  const model = log?.model_name || '';
  return `${app}.${model}`.toLowerCase();
};

const getModelLabel = (log) => {
  const key = getModelKey(log);
  const label = modelLabelMap[key];
  if (label) return label;
  return (log?.model_name || '').replace(/_/g, ' ') || 'Registro';
};

const getActionLabel = (action) => actionLabelMap[action] || action || 'Acao';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Nao';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  return String(value);
};

const mapFields = (obj, modelKey) => {
  if (!obj || typeof obj !== 'object') return [];
  const labels = fieldLabelsByModel[modelKey] || {};
  return Object.entries(obj).map(([key, value]) => ({
    label: labels[key] || key.replace(/_/g, ' '),
    value: formatValue(value)
  }));
};

const mapDiff = (diff, modelKey) => {
  if (!diff || typeof diff !== 'object') return [];
  const labels = fieldLabelsByModel[modelKey] || {};
  return Object.entries(diff).map(([key, value]) => ({
    label: labels[key] || key.replace(/_/g, ' '),
    before: formatValue(value?.before),
    after: formatValue(value?.after)
  }));
};

const formatSummary = (log) => {
  const action = getActionLabel(log?.action);
  const model = getModelLabel(log);
  const subject = log?.object_repr || '';
  return subject ? `${action} em ${model}: ${subject}` : `${action} em ${model}`;
};

export default function Logs() {
  const { api } = useAuth();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchNonce, setSearchNonce] = useState(0);

  const [operatorOptions, setOperatorOptions] = useState([]);

  const [filterType, setFilterType] = useState('texto');
  const [filterValue, setFilterValue] = useState('');
  const [activeFilters, setActiveFilters] = useState([]);

  const [detailLog, setDetailLog] = useState(null);

  useEffect(() => {
    if (!api) return;
    api.get('operadores/?nopage=true')
      .then((res) => {
        const data = res.data.results || res.data;
        setOperatorOptions(data.map((op) => ({ id: op.id, label: op.first_name || op.username })));
      })
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    if (!hasSearched) return;
    loadData();
  }, [api, activeFilters, page, hasSearched, searchNonce]);

  const loadData = async () => {
    if (!api) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      activeFilters.forEach((f) => {
        if (!f.value) return;
        if (f.type === 'texto') params.append('search', f.value);
        else params.append(f.type, f.value);
      });

      const res = await api.get(`auditoria/logs/?${params.toString()}`);
      setLogs(res.data.results || []);
      const count = res.data.count || 0;
      setTotalPages(res.data.num_pages || Math.max(1, Math.ceil(count / (res.data.page_size || 1))));
    } catch (error) {
      notify?.error?.('Erro ao carregar logs.');
    } finally {
      setLoading(false);
    }
  };

  const addFilter = () => {
    if (!filterValue) return;
    const typeLabel = filterTypeOptions.find((o) => o.value === filterType)?.label || 'Filtro';
    let display = filterValue;
    if (filterType === 'operator_id') {
      display = operatorOptions.find((o) => String(o.id) === String(filterValue))?.label || filterValue;
    }
    if (filterType === 'action') {
      display = actionOptions.find((o) => o.value === filterValue)?.label || filterValue;
    }
    const newFilter = { id: Date.now(), type: filterType, value: filterValue, display: `${typeLabel}: ${display}` };
    const cleanFilters = activeFilters.filter((f) => f.type !== filterType);
    setActiveFilters([...cleanFilters, newFilter]);
    setFilterValue('');
    setPage(1);
    setHasSearched(true);
    setSearchNonce((value) => value + 1);
  };

  const removeFilter = (id) => setActiveFilters(activeFilters.filter((f) => f.id !== id));
  const clearAllFilters = () => {
    setActiveFilters([]);
    setFilterValue('');
    setPage(1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addFilter();
  };

  const handleSearch = () => {
    if (filterValue) {
      addFilter();
      return;
    }
    setHasSearched(true);
    setPage(1);
    setSearchNonce((value) => value + 1);
  };

  const filterTypeOptions = [
    { value: 'texto', label: 'Busca Geral' },
    { value: 'operator_id', label: 'Operador' },
    { value: 'action', label: 'Acao' },
    { value: 'model', label: 'Tela' },
    { value: 'object_id', label: 'Item' },
    { value: 'date_start', label: 'Data Inicio' },
    { value: 'date_end', label: 'Data Fim' }
  ];

  const renderDynamicInput = () => {
    const commonClass = 'w-full pl-3 pr-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl outline-none dark:text-white focus:ring-2 focus:ring-blue-100 transition-all h-full text-sm font-bold';
    switch (filterType) {
      case 'date_start':
      case 'date_end':
        return <input type="date" value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={commonClass} onKeyDown={handleKeyDown} />;
      case 'operator_id':
        return (
          <FilterSearchableSelect
            placeholder="Digite o operador..."
            options={operatorOptions}
            value={filterValue}
            onChange={setFilterValue}
            onEnter={addFilter}
          />
        );
      case 'action':
        return (
          <select value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={commonClass}>
            <option value="">Selecione...</option>
            {actionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
      default:
        return <input placeholder="Digite para buscar..." value={filterValue} onChange={(e) => setFilterValue(e.target.value)} className={commonClass} onKeyDown={handleKeyDown} />;
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const thClass = 'px-5 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest';
  const tdClass = 'px-5 py-4 text-sm text-slate-700 dark:text-slate-300';
  const detailModelKey = detailLog ? getModelKey(detailLog) : '';
  const detailBefore = detailLog ? mapFields(detailLog.before, detailModelKey) : [];
  const detailAfter = detailLog ? mapFields(detailLog.after, detailModelKey) : [];
  const detailDiff = detailLog ? mapDiff(detailLog.diff, detailModelKey) : [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto pb-10 tracking-tight">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
              <FileText className="text-blue-600" /> Logs de Acesso
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Auditoria de criacao, alteracao, exclusao e relatorios
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-700 mb-6">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="w-full md:w-64">
              <div className="relative h-11">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full h-full pl-10 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 appearance-none cursor-pointer"
                >
                  {filterTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><Filter size={14} /></div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"><ChevronDown size={14} /></div>
              </div>
            </div>
            <div className="flex-1 h-11 relative">
              {renderDynamicInput()}
              <button onClick={handleSearch} className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 text-white p-2 rounded-xl shadow-lg hover:bg-blue-700 transition">
                <Search size={14} />
              </button>
            </div>
            <button onClick={clearAllFilters} className="h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
              Limpar
            </button>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {activeFilters.map((f) => (
                <span key={f.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest">
                  {f.display}
                  <button onClick={() => removeFilter(f.id)} className="text-blue-500 hover:text-blue-700"><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Operador</th>
                  <th className={thClass}>Acao</th>
                  <th className={thClass}>Tela</th>
                  <th className={thClass}>Item</th>
                  <th className={thClass}>Resumo</th>
                  <th className="px-5 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {!hasSearched ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">
                      Clique na lupa para carregar os logs.
                    </td>
                  </tr>
                ) : loading ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center">
                      <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={32} />
                      <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Carregando logs...</span>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum log encontrado.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className={tdClass}>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                          <CalendarDays size={12} className="text-slate-400" />
                          {formatDate(log.created_at)}
                        </div>
                      </td>
                      <td className={tdClass}>
                        <div className="flex items-center gap-2">
                          <User size={12} className="text-slate-400" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                            {log.operator_name || log.operator_username || 'Sistema'}
                          </span>
                        </div>
                      </td>
                      <td className={tdClass}>
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className={tdClass}>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{getModelLabel(log)}</span>
                      </td>
                      <td className={tdClass}>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{log.object_id || '-'}</span>
                      </td>
                      <td className={tdClass}>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{formatSummary(log)}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => setDetailLog(log)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition">
                          <Eye size={12} /> Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Pagina {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
          >
            Proxima
          </button>
        </div>

        {detailLog && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[82vh] overflow-hidden border border-white/10">
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                <h3 className="font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  <FileText size={16} className="text-blue-300"/> Detalhe do Log
                </h3>
                <button onClick={() => setDetailLog(null)} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto max-h-[72vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Antes</p>
                    {detailBefore.length === 0 ? (
                      <p className="text-xs text-slate-400 mt-2">Sem dados</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {detailBefore.map((item) => (
                          <div key={item.label} className="flex items-start justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 text-right">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Depois</p>
                    {detailAfter.length === 0 ? (
                      <p className="text-xs text-slate-400 mt-2">Sem dados</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {detailAfter.map((item) => (
                          <div key={item.label} className="flex items-start justify-between gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 text-right">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alteracoes</p>
                  {detailDiff.length === 0 ? (
                    <p className="text-xs text-slate-400 mt-2">Sem alteracoes</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {detailDiff.map((item) => (
                        <div key={item.label} className="flex flex-col gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{item.label}</div>
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="text-slate-400">Antes</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.before}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="text-slate-400">Depois</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">{item.after}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
