import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

/**
 * Breadcrumb điều hướng phân cấp
 * @param {{ items: Array<{ label: string, to?: string }> }} props
 * items: mảng các bước, item cuối cùng không có `to` (trang hiện tại)
 */
export default function Breadcrumb({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 sm:px-6 lg:px-10 pt-4 pb-2 overflow-x-auto">
      <Link
        to="/"
        className="flex items-center space-x-1 text-slate-400 dark:text-slate-500 hover:text-teal-500 dark:hover:text-teal-400 transition-colors shrink-0"
      >
        <Home className="w-3.5 h-3.5" />
        <span>Trang chủ</span>
      </Link>
      {items.map((item, index) => (
        <span key={index} className="flex items-center space-x-1.5 shrink-0">
          <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
          {item.to ? (
            <Link
              to={item.to}
              className="text-slate-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-700 dark:text-slate-200 font-bold">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
