import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2, AlertCircle } from 'lucide-react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const notify = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  const confirmDialog = useCallback((message, title = 'Confirmação', confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'danger') => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        onConfirm: () => {
          setDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setDialog(null);
          resolve(false);
        }
      });
    });
  }, []);

  const toastConfig = {
    success: { icon: CheckCircle2, color: 'bg-emerald-500', border: 'border-emerald-600', shadow: 'shadow-emerald-500/20' },
    error: { icon: XCircle, color: 'bg-rose-500', border: 'border-rose-600', shadow: 'shadow-rose-500/20' },
    warning: { icon: AlertTriangle, color: 'bg-amber-500', border: 'border-amber-600', shadow: 'shadow-amber-500/20' },
    info: { icon: Info, color: 'bg-blue-500', border: 'border-blue-600', shadow: 'shadow-blue-500/20' },
  };

  return (
    <NotificationContext.Provider value={{ notify, confirmDialog }}>
      {children}

      {/* RENDERIZAÇÃO DOS TOASTS (Canto Superior Direito) */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => {
          const config = toastConfig[t.type];
          const Icon = config.icon;
          return (
            <div key={t.id} className={`pointer-events-auto relative group overflow-hidden ${config.color} text-white p-4 rounded-2xl shadow-2xl ${config.shadow} flex items-center gap-4 min-w-[320px] max-w-md animate-in slide-in-from-right-10 duration-500`}>
              <div className="bg-white/20 p-2 rounded-xl">
                <Icon size={20} strokeWidth={3} />
              </div>
              <p className="font-black text-xs uppercase tracking-tight flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                <X size={16} strokeWidth={3}/>
              </button>
              
              {/* Barra de Progresso (Timer) */}
              <div className="absolute bottom-0 left-0 h-1 bg-black/10 animate-progress-toast" style={{ width: '100%' }}></div>
            </div>
          );
        })}
      </div>

      {/* RENDERIZAÇÃO DO DIALOG (Estilo Centralizado de Segurança) */}
      {dialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[32px] shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
            <div className={`p-8 flex flex-col items-center text-center ${dialog.variant === 'danger' ? 'text-rose-600' : 'text-blue-600'}`}>
               <div className={`mb-4 p-4 rounded-3xl ${dialog.variant === 'danger' ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
                  {dialog.variant === 'danger' ? <AlertCircle size={48} /> : <CheckCircle2 size={48} />}
               </div>
               <h3 className="text-xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">{dialog.title}</h3>
               <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium leading-relaxed">{dialog.message}</p>
            </div>
            
            <div className="flex p-6 gap-3 bg-slate-50/50 dark:bg-slate-900/50 border-t dark:border-slate-700">
              <button 
                onClick={dialog.onCancel}
                className="flex-1 px-4 py-3 text-slate-500 dark:text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
              >
                {dialog.cancelText}
              </button>
              <button 
                onClick={dialog.onConfirm}
                className={`flex-1 px-4 py-3 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl transition-all active:scale-95 ${
                  dialog.variant === 'danger' 
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20' 
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adicionar ao seu arquivo tailwind.config.js se quiser a animação da barra:
          extend: {
            keyframes: {
              'progress-toast': {
                '0%': { width: '100%' },
                '100%': { width: '0%' },
              }
            },
            animation: {
              'progress-toast': 'progress-toast 4s linear forwards',
            }
          }
      */}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);