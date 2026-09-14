import { useState, useRef, useEffect } from 'react';
import { Type } from 'lucide-react';

const CHAR_GROUPS = [
  { name: 'Số mũ', chars: ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'] },
  { name: 'Chỉ số dưới', chars: ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'] },
  { name: 'So sánh', chars: ['≤', '≥', '≠', '±', '≈'] },
  { name: 'Mũi tên', chars: ['↑', '↓', '←', '→'] },
  { name: 'Đơn vị', chars: ['µ', '℃', '℉', 'Ω', 'ℓ'] },
  { name: 'Hy Lạp', chars: ['α', 'β', 'γ', 'δ'] },
  { name: 'Y khoa', chars: ['×', '÷', '√', '°'] },
];

export default function MedicalCharPicker({ onInsert }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 transition-colors"
        title="Chèn ký tự y khoa"
      >
        <Type className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 right-0 mt-2 w-64 p-3 bg-white dark:bg-navy-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 max-h-80 overflow-y-auto">
          {CHAR_GROUPS.map(group => (
            <div key={group.name} className="mb-3 last:mb-0">
              <div className="text-xs font-bold text-slate-500 mb-1">{group.name}</div>
              <div className="flex flex-wrap gap-1">
                {group.chars.map(char => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => {
                      onInsert(char);
                      setIsOpen(false);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded bg-slate-50 hover:bg-teal-50 dark:bg-white/5 dark:hover:bg-teal-500/20 text-slate-700 dark:text-slate-200 hover:text-teal-600 font-medium transition-colors"
                  >
                    {char}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
