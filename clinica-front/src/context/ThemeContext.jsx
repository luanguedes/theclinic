import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // 1. Lógica de detecção inteligente: LocalStorage > Preferência do Sistema > Light
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;

    // Se não houver salvo, verifica se o PC do usuário prefere Dark Mode
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // 2. Aplicação limpa e segura
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    
    // 3. Persistência
    localStorage.setItem('theme', theme);

    // 4. Melhoria de performance visual:
    // Adiciona uma classe temporária para permitir transições suaves de cor
    root.style.setProperty('color-scheme', theme);
    
  }, [theme]);

  // Listener para mudar o tema se o usuário mudar a configuração do Windows/MacOS enquanto usa o app
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme')) { // Só muda sozinho se o usuário nunca escolheu manualmente
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);