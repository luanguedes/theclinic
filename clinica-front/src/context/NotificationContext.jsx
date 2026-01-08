import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  // --- LÓGICA DOS TOASTS (NOTIFICAÇÕES) ---
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Atalhos para facilitar
  const notify = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    warning: (msg) => addToast(msg, 'warning'),
    info: (msg) => addToast(msg, 'info'),
  };

  // --- LÓGICA DO DIALOG (CONFIRMAÇÃO) ---
  // Retorna uma Promise para podermos usar: await confirm(...)
  const confirmDialog = useCallback((message, title = 'Confirmação', confirmText = 'Confirmar', cancelText = 'Cancelar', variant = 'danger') => {
    return new Promise((resolve) => {
      setDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant, // 'danger' (vermelho) ou 'primary' (azul)
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

  // --- COMPONENTES VISUAIS INTERNOS ---
  
  // Ícones e cores baseados no tipo
  const toastConfig = {
    success: { icon: CheckCircle2, color: 'bg-green-500', border: 'border-green-600', text: 'text-white' },
    error: { icon: XCircle, color: 'bg-red-500', border: 'border-red-600', text: 'text-white' },
    warning: { icon: AlertTriangle, color: 'bg-orange-500', border: 'border-orange-600', text: 'text-white' },
    info: { icon: Info, color: 'bg-blue-500', border: 'border-blue-600', text: 'text-white' },
  };

  return (
    <NotificationContext.Provider value={{ notify, confirmDialog }}>
      {children}

      {/* RENDERIZAÇÃO DOS TOASTS (Canto Superior Direito) */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => {
          const config = toastConfig[t.type];
          const Icon = config.icon;
          return (
            <div key={t.id} className={`${config.color} ${config.text} border-l-4 ${config.border} p-4 rounded-r shadow-lg flex items-center gap-3 min-w-[300px] animate-in slide-in-from-right duration-300`}>
              <Icon size={24} />
              <p className="font-medium text-sm flex-1">{t.message}</p>
              <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100"><X size={18}/></button>
            </div>
          );
        })}
      </div>

      {/* RENDERIZAÇÃO DO MODAL DE CONFIRMAÇÃO */}
      {dialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 transform scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{dialog.title}</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{dialog.message}</p>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={dialog.onCancel}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                {dialog.cancelText}
              </button>
              <button 
                onClick={dialog.onConfirm}
                className={`px-6 py-2 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95 ${
                  dialog.variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export const useNotification = () => useContext(NotificationContext);