import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronRight } from 'lucide-react';
import { DASHBOARD_ITEM, MENU_ITEMS } from '../config/navigation';

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <aside className="flex flex-col w-24 md:w-28 px-2 md:px-3 py-6 border-r border-slate-100 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md sticky top-16 h-[calc(100vh-64px)] z-[80]">
      <div className="flex flex-col gap-3">
        <Link
          to={DASHBOARD_ITEM.to}
          className={`w-full flex flex-col items-center gap-1 py-4 rounded-3xl transition-all ${
            location.pathname === DASHBOARD_ITEM.to
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
          }`}
        >
          <DASHBOARD_ITEM.icon size={20} />
          <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{DASHBOARD_ITEM.label}</span>
        </Link>
        {MENU_ITEMS.filter((m) => m.access(user)).map((menu) => {
          const Icon = menu.icon;
          const isActive = menu.items.some((i) => location.pathname.startsWith(i.to));
          return (
            <div key={menu.key} className="relative group">
              <div className={`w-full flex flex-col items-center gap-1 py-4 rounded-3xl transition-all cursor-pointer ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
              }`}>
                <Icon size={20} />
                <span className="text-[9px] font-black uppercase tracking-widest text-center leading-tight">{menu.label}</span>
              </div>

              <div className="absolute left-full top-0 ml-3 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[9999]">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden drop-shadow-2xl">
                  <div className="p-3 border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Icon size={14}/> {menu.label}
                  </div>
                  <div className="p-2 space-y-1">
                    {menu.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            active
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <ItemIcon size={14} className={active ? 'text-blue-600' : 'text-slate-400'} />
                            {item.label}
                          </span>
                          <ChevronRight size={12} className="text-slate-300" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
