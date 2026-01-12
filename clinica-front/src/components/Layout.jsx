import Navbar from './Navbar';

/**
 * Layout Principal do Sistema
 * Gerencia a estrutura mestre, transições de tema e 
 * o container centralizado para todas as telas.
 */
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-500 ease-in-out selection:bg-blue-100 dark:selection:bg-blue-900/40">
      
      {/* Barra de Navegação Superior */}
      <Navbar />

      {/* Área de Conteúdo Principal */}
      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-8 max-w-7xl">
        
        {/* Wrapper de animação: garante que cada página carregada 
          tenha um efeito suave de entrada.
        */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
          {children}
        </div>
        
      </main>

      {/* Rodapé ou Indicador de Segurança (Opcional) */}
      <footer className="py-6 text-center opacity-30 text-[10px] font-bold uppercase tracking-widest pointer-events-none">
        TheClinic v1.0 • Sistema de Gestão em Saúde Protegido
      </footer>
    </div>
  );
}