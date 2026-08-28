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
    return () => {
      document.title = previousTitle;
    };
  }, [title]);
}
