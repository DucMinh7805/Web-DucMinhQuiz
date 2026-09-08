import { useEffect } from 'react';

const SITE_NAME = 'DiamondQuiz';

/**
 * Hook đặt tiêu đề trang trên tab trình duyệt.
 * Tự động thêm hậu tố " - DiamondQuiz" nếu có title.
 * Khôi phục title mặc định khi component unmount.
 */
export default function usePageTitle(title) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} - ${SITE_NAME}` : `${SITE_NAME} - Y Khoa Lâm Sàng`;

    // Ép cập nhật favicon sang logo DiamondQuiz chính thức
    const iconLinks = document.querySelectorAll("link[rel='icon'], link[rel='shortcut icon']");
    iconLinks.forEach(link => {
      link.href = '/icons/diamondquiz-full-192-v3.png';
    });

    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
