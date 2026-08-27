import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class GraphErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GraphErrorBoundary] Đồ thị gặp lỗi kết nối hoặc render:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-slate-50 dark:bg-[#070b14] text-slate-800 dark:text-slate-200">
          <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
              Không thể hiển thị Đồ thị 2D
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Có thể do kết nối mạng chập chờn hoặc trình duyệt đang hạn chế tài nguyên đồ họa WebGL/Canvas.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-teal-500/20 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử tải lại Đồ thị</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GraphErrorBoundary;
