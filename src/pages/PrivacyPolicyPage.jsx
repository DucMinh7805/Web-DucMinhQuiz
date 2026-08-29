import { ShieldCheck, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';

export default function PrivacyPolicyPage() {
  usePageTitle('Chính sách bảo mật');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060a14] py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <button
          onClick={() => navigate('/')}
          className="group flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors bg-white dark:bg-white/5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 w-fit shadow-sm"
        >
          <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          Trở về Trang chủ
        </button>

        <div className="bg-white dark:bg-[#0c1222] rounded-3xl p-6 sm:p-10 border border-slate-200 dark:border-white/10 shadow-sm">
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-teal-500/10 rounded-2xl">
              <ShieldCheck className="w-8 h-8 text-teal-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                Chính Sách Bảo Mật
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Cập nhật lần cuối: Tháng 8, 2026
              </p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-teal-500 mt-8 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                1. Thông tin chúng tôi thu thập
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Để cung cấp trải nghiệm học tập tốt nhất, DiamondQuiz có thể thu thập các thông tin sau:
              </p>
              <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 space-y-2 mt-2">
                <li>Thông tin tài khoản: Email, Tên hiển thị, Số điện thoại (nếu có).</li>
                <li>Dữ liệu học tập: Lịch sử làm bài, số câu đúng/sai, thời gian làm bài, tiến độ học tập.</li>
                <li>Dữ liệu hệ thống: Địa chỉ IP, loại trình duyệt, hệ điều hành nhằm mục đích chẩn đoán và cải thiện hệ thống.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                2. Mục đích sử dụng
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Thông tin được thu thập nhằm các mục đích:
              </p>
              <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 space-y-2 mt-2">
                <li>Xác thực và duy trì phiên đăng nhập của người dùng.</li>
                <li>Đồng bộ tiến độ học tập và sổ tay câu sai giữa các thiết bị.</li>
                <li>Cá nhân hóa trải nghiệm học tập và đề xuất nội dung phù hợp.</li>
                <li>Phân tích, thống kê để nâng cấp và cải thiện chất lượng của DiamondQuiz.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                3. Bảo mật thông tin
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                DiamondQuiz cam kết bảo vệ thông tin cá nhân của bạn:
              </p>
              <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 space-y-2 mt-2">
                <li>Dữ liệu truyền tải được mã hóa.</li>
                <li>Hệ thống máy chủ áp dụng các biện pháp bảo mật chặt chẽ.</li>
                <li>Chúng tôi <strong>không bán, trao đổi, hoặc chia sẻ</strong> dữ liệu cá nhân của bạn cho bất kỳ bên thứ ba nào vì mục đích thương mại.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                4. Quyền của người dùng
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Là người dùng của DiamondQuiz, bạn có các quyền sau:
              </p>
              <ul className="list-disc pl-5 text-slate-600 dark:text-slate-300 space-y-2 mt-2">
                <li>Xem và chỉnh sửa thông tin cá nhân trong phần Hồ sơ.</li>
                <li>Yêu cầu xuất dữ liệu học tập cá nhân.</li>
                <li>Yêu cầu xóa toàn bộ dữ liệu tài khoản khỏi hệ thống của chúng tôi bất kỳ lúc nào.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4">
                5. Liên hệ
              </h2>
              <p className="text-slate-600 dark:text-slate-300">
                Nếu bạn có bất kỳ câu hỏi hoặc phản hồi nào về Chính sách bảo mật này, xin vui lòng liên hệ với chúng tôi:
              </p>
              <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl mt-4 border border-slate-200 dark:border-white/5">
                <p className="text-slate-700 dark:text-slate-200 font-medium">Email: diamondquiz22.7@gmail.com</p>
                <p className="text-slate-700 dark:text-slate-200 font-medium mt-1">SĐT: 0383.123.165 (Zalo hỗ trợ)</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
