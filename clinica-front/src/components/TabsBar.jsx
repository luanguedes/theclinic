import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, PinOff, X } from 'lucide-react';
import { useTabs } from '../context/TabsContext';

export default function TabsBar() {
  const { tabs, currentPath, closeTab, togglePin, moveTab } = useTabs();
  const navigate = useNavigate();
  const [dragIndex, setDragIndex] = useState(null);
  const handleClose = (path) => {
    const idx = tabs.findIndex((t) => t.path === path);
    const isActive = currentPath === path || currentPath.startsWith(`${path}/`);
    closeTab(path);
    if (isActive) {
      const next = tabs[idx - 1] || tabs[idx + 1];
      navigate(next ? (next.lastPath || next.path) : '/dashboard');
    }
  };

  return (
    <div className="relative flex items-center justify-start w-full min-w-0 overflow-hidden gap-2 flex-nowrap">
      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = currentPath === tab.path || currentPath.startsWith(`${tab.path}/`);
        const z = 50 + idx;
        return (
          <div
            key={tab.path}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) moveTab(dragIndex, idx);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer min-w-0 ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30'
                : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            onClick={() => navigate(tab.lastPath || tab.path)}
            title={tab.title}
            style={{ zIndex: z }}
          >
            {Icon && <Icon size={14} className="shrink-0" />}
            <span className="min-w-0 flex-1 truncate text-left">{tab.title}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePin(tab.path); }}
              className={`p-1 rounded-md transition-colors shrink-0 ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              title={tab.pinned ? 'Desafixar' : 'Fixar'}
            >
              {tab.pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClose(tab.path); }}
              className={`p-1 rounded-md transition-colors shrink-0 ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              title="Fechar"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      {tabs.length === 0 && (
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-2">
          Nenhuma aba aberta
        </div>
      )}
    </div>
  );
}
