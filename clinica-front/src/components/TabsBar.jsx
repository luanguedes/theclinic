import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, PinOff, X } from 'lucide-react';
import { useTabs } from '../context/TabsContext';

export default function TabsBar() {
  const { tabs, currentPath, closeTab, togglePin, moveTab } = useTabs();
  const navigate = useNavigate();
  const [dragIndex, setDragIndex] = useState(null);
  const [shouldOverlap, setShouldOverlap] = useState(false);
  const containerRef = useRef(null);

  const handleClose = (path) => {
    const idx = tabs.findIndex((t) => t.path === path);
    const isActive = currentPath === path;
    closeTab(path);
    if (isActive) {
      const next = tabs[idx - 1] || tabs[idx + 1];
      navigate(next ? next.path : '/dashboard');
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const check = () => {
      setShouldOverlap(el.scrollWidth > el.clientWidth + 8);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tabs.length]);

  const maxSlots = Math.max(1, Math.min(5, tabs.length));
  const overlap = shouldOverlap ? (maxSlots > 4 ? 14 : maxSlots > 3 ? 12 : 8) : 0;

  return (
    <div ref={containerRef} className="relative flex items-center justify-center w-full overflow-hidden">
      {tabs.map((tab, idx) => {
        const Icon = tab.icon;
        const isActive = currentPath === tab.path;
        const z = 50 + idx;
        const offset = idx === 0 ? 0 : -overlap * idx;
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
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              isActive
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/30'
                : 'bg-white/60 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${shouldOverlap ? '' : 'mr-2'}`}
            onClick={() => navigate(tab.path)}
            title={tab.title}
            style={{ marginLeft: offset, zIndex: z }}
          >
            {Icon && <Icon size={14} />}
            <span className="whitespace-nowrap">{tab.title}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); togglePin(tab.path); }}
              className={`p-1 rounded-md transition-colors ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              title={tab.pinned ? 'Desafixar' : 'Fixar'}
            >
              {tab.pinned ? <PinOff size={12} /> : <Pin size={12} />}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); handleClose(tab.path); }}
              className={`p-1 rounded-md transition-colors ${isActive ? 'hover:bg-white/20' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
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
