import { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Home, User, LogOut, Bookmark, Activity, 
  Menu, X, PanelLeftClose, Sun, Moon,
  Network, Search, BookOpen
} from 'lucide-react';
import GlobalSearchModal from '../components/Search/GlobalSearchModal';
import FloatingContactButton from '../components/Common/FloatingContactButton';

/**
 * MainLayout: Bố cục thanh điều hướng bên trái
 * - Bề ngang vừa vặn, cỡ chữ to rõ ràng
 * - Hỗ trợ Spotlight Search toàn cục Ctrl + K
 * - Phân chia rõ ràng: Tổng quan (/), Bản đồ tri thức (/graph), Kho Sách (/library)
 */
export default function MainLayout({ manifest }) {
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Lắng nghe phím tắt toàn cục Ctrl + K hoặc Ctrl + F để mở tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLogout = (e) => {
    e.stopPropagation();
    logout();
    navigate('/login');
  };

  const mistakesCount = user?.mistakes?.length || 0;

  const navItems = [
    {
      to: '/',
      label: 'Tổng quan',
      icon: Home,
      isActive: location.pathname === '/'
    },
    {
      to: '/graph',
      label: 'Bản đồ tri thức',
      icon: Network,
      isActive: location.pathname === '/graph'
    },
    {
      to: '/library',
      label: 'Kho Sách & Slide',
      icon: BookOpen,
      isActive: location.pathname === '/library'
    },
    {
      to: '/lab-values',
      label: 'Trị số Lab',
      icon: Activity,
      isActive: location.pathname === '/lab-values'
    },
    {
      to: '/mistakes',
      label: 'Sổ tay câu sai',
      icon: Bookmark,
      badge: mistakesCount > 0 ? mistakesCount : null,
      badgeColor: 'bg-error text-white',
      isActive: location.pathname === '/mistakes'
    },
    {
      to: '/profile',
      label: 'Hồ sơ cá nhân',
      icon: User,
      isActive: location.pathname === '/profile'
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#060a14] text-slate-800 dark:text-slate-200 flex flex-col md:flex-row antialiased selection:bg-teal-500/20 selection:text-teal-700 relative">
      
      {/* Global Ocean Cyan Mesh Ambient Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle Cyber Medical Mesh Dots */}
        <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-20 dark:opacity-15" />
        {/* Ambient glows */}
        <div className="absolute -top-24 right-1/4 w-[700px] h-[400px] bg-teal-500/10 dark:bg-teal-500/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-24 left-1/3 w-[600px] h-[400px] bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-[140px]" />
      </div>

      {/* Global Spotlight Search Modal */}
      <GlobalSearchModal 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        manifest={manifest}
      />

      {/* Mobile Header (Mềm mại, đồng nhất màu nền, không bị lệch viền) */}
      <div className="mobile-safe-header md:hidden bg-white/80 dark:bg-[#060a14]/80 backdrop-blur-xl border-b border-slate-200/40 dark:border-white/5 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
        <Link to="/" className="flex items-center space-x-2">
          <img src="/diamond_quiz.png" alt="DiamondQuiz" width="1536" height="1024" loading="eager" decoding="async" className="h-8 w-10 object-contain" />
          <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
            Diamond<span className="text-teal-500">Quiz</span>
          </span>
        </Link>
        <div className="flex items-center space-x-1.5">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-teal-500"
            title="Tìm kiếm (Ctrl + K)"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Left Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 inset-y-0 left-0 z-50 bg-white/95 dark:bg-[#080d1a]/95 backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 flex flex-col justify-between transition-all duration-300 md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'} h-[100dvh] shrink-0 shadow-xl safe-area-drawer`}
      >
        {/* Top: Logo & Collapse Trigger */}
        <div>
          <div className="p-4 border-b border-slate-100/80 dark:border-white/10 flex items-center justify-between">
            {/* Desktop Collapsed Logo Only */}
            <div className={`hidden ${isCollapsed ? 'md:flex' : 'hidden'} flex-col items-center py-1 group w-full`}>
              <button 
                onClick={() => setIsCollapsed(false)}
                title="Mở rộng thanh công cụ"
              >
                <img
                  src="/diamond_quiz.png"
                  alt="DiamondQuiz"
                  loading="lazy"
                  className="h-10 w-10 object-contain rounded-2xl group-hover:scale-110 transition-transform drop-shadow-md"
                />
              </button>
            </div>

            {/* Normal Full Logo & Close/Collapse Button */}
            <div className={`flex items-center justify-between w-full ${isCollapsed ? 'md:hidden' : ''}`}>
              <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center space-x-3 min-w-0 group">
                <img
                  src="/diamond_quiz.png"
                  alt="DiamondQuiz"
                  loading="lazy"
                  className="h-9 w-9 object-contain rounded-xl shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0">
                  <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight block">
                    Diamond<span className="text-teal-500">Quiz</span>
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">
                    Y Khoa Lâm Sàng
                  </span>
                </div>
              </Link>

              <div className="flex items-center space-x-1">
                {/* Desktop Collapse Trigger */}
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  title="Thu gọn thanh công cụ"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>

                {/* Mobile Drawer Close Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="md:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  title="Đóng menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Quick Search Shortcut Button */}
          {!isCollapsed ? (
            <div className="px-3 mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 group-hover:text-teal-500 transition-colors" />
                  <span>Tìm kiếm nhanh...</span>
                </div>
                <kbd className="px-1.5 py-0.5 rounded-md bg-white dark:bg-[#0b1120] border border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-400 shadow-2xs">
                  Ctrl K
                </kbd>
              </button>
            </div>
          ) : (
            <div className="flex justify-center mt-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSearchOpen(true);
                }}
                className="p-3 rounded-2xl bg-slate-100 dark:bg-white/5 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-500 hover:text-teal-500 transition-colors"
                title="Tìm kiếm (Ctrl + K)"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'justify-between px-3.5 py-3'} rounded-2xl text-sm font-bold transition-all relative group ${
                    item.isActive
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-500/25'
                      : 'text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300 hover:bg-slate-100/80 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${item.isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-teal-500'}`} />
                    {!isCollapsed && <span className="truncate text-sm">{item.label}</span>}
                  </div>

                  {item.badge && !isCollapsed && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-black shrink-0 ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}

                  {item.badge && isCollapsed && (
                    <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-error rounded-full border-2 border-white dark:border-[#0b1120]" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom: User Info, Theme Toggle & Logout */}
        <div className="p-3 border-t border-slate-100/80 dark:border-white/10 bg-slate-50/60 dark:bg-black/20">
          {/* Theme Toggle cho Desktop */}
          {!isCollapsed && (
             <div className="flex items-center justify-between px-3 py-2 mb-3 bg-white/60 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5">
               <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Giao diện</span>
               <button 
                 onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                 className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:text-teal-500 transition-colors"
                 title="Đổi Giao Diện Sáng/Tối"
               >
                 {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
               </button>
             </div>
          )}

          {user ? (
            <div className={`flex items-center ${isCollapsed ? 'justify-center p-1' : 'justify-between p-2.5'} rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 shadow-sm`}>
              <Link 
                to="/profile" 
                onClick={(_e) => {
                  if (isCollapsed) {}
                }}
                className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} min-w-0 flex-1`} 
                title={isCollapsed ? user.name : undefined}
              >
                <div className="w-8 h-8 rounded-xl bg-teal-500/15 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-extrabold text-xs flex items-center justify-center shrink-0 border border-teal-500/20 overflow-hidden shadow-xs">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name ? user.name.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate leading-tight">{user.name}</p>
                    <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold truncate leading-tight mt-0.5">{user.role}</p>
                  </div>
                )}
              </Link>

              {!isCollapsed && (
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-error dark:hover:text-error hover:bg-error-50 dark:hover:bg-error-900/30 rounded-lg transition-colors ml-1"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-bold text-xs rounded-xl flex items-center justify-center shadow-sm"
            >
              {!isCollapsed ? 'Đăng nhập' : <User className="w-4 h-4" />}
            </Link>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 dark:bg-navy-900/60 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 relative overflow-y-auto">
        <Outlet context={manifest} />
      </main>
      
      <FloatingContactButton />
    </div>
  );
}
