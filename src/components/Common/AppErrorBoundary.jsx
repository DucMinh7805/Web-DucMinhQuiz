import React from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[AppErrorBoundary] Ứng dụng gặp sự cố:', error, errorInfo);
  }

  handleReload = () => {
    localStorage.removeItem('medquiz_manifest');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#060a14] text-slate-800 dark:text-slate-200">
          <div className="max-w-md w-full bg-white dark:bg-[#0c1222] rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-white/10 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Đã xảy ra lỗi tải dữ liệu
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hệ thống phát hiện lỗi hiển thị hoặc bộ nhớ đệm cũ. Vui lòng bấm làm mới để tải lại dữ liệu chuẩn.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 text-[11px] text-rose-600 dark:text-rose-400 font-mono text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-xs font-bold shadow-md shadow-teal-500/20 flex items-center justify-center space-x-2 transition-transform active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Xóa Cache &amp; Tải Lại</span>
              </button>

              <a
                href="/"
                className="py-3 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Về Trang Chủ</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
