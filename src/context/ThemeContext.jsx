/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Kiểm tra trong localStorage hoặc thiết lập hệ thống
    let stored = null;
    try {
      stored = localStorage.getItem('theme');
    } catch {
      // Một số chế độ riêng tư chặn storage; vẫn cho phép app hoạt động.
    }
    if (stored) {
      return stored === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      try { localStorage.setItem('theme', 'dark'); } catch { /* storage có thể bị chặn */ }
    } else {
      root.classList.remove('dark');
      try { localStorage.setItem('theme', 'light'); } catch { /* storage có thể bị chặn */ }
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
