import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    // Adicionei dark:bg-slate-900 e dark:text-slate-100
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-300">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}