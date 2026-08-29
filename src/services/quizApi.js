import { API_CONFIG } from '../config/api';
import { DEFAULT_SAMPLE_MANIFEST } from '../data/defaultManifest';

/**
 * Lấy danh sách Manifest (Chuyên khoa, Môn học, Bộ đề, Sách & Slide)
 * - Tự động timeout sau 3.5 giây nếu Google Apps Script phản hồi chậm/lỗi
 * - Luôn fallback an toàn sang DEFAULT_SAMPLE_MANIFEST để ứng dụng tải tức thì 0.05s, không bao giờ bị trắng màn hình
 */
export async function fetchManifest() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getManifest`, { 
      redirect: "follow",
      credentials: "omit",
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (res.ok) {
      const rawText = await res.text();
      if (rawText && (rawText.trim().startsWith('{') || rawText.trim().startsWith('['))) {
        const data = JSON.parse(rawText);
        if (data && Array.isArray(data.subjects) && data.subjects.length > 0) {
          return {
            subjects: data.subjects,
            books: Array.isArray(data.books) ? data.books : []
          };
        }
      }
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.warn('[QuizAPI] Máy chủ Google Script chậm/lỗi, tự động sử dụng Manifest mặc định:', error);
  }

  // Fallback an toàn tuyệt đối: Luôn có dữ liệu đầy đủ
  return DEFAULT_SAMPLE_MANIFEST;
}

/**
 * Lấy nội dung chi tiết của một Đề thi (Danh sách câu hỏi & hình ảnh)
 * Hỗ trợ trọn vẹn: Trắc nghiệm đơn, Nhiều đáp án, Tự luận ngắn điền từ (Short Answer)
 * @param {string} actualPath - Đường dẫn bộ đề (VD: 'noi-tim-mach/de-1' hoặc 'y-khoa/thuc-tap-giai-phau/de-1')
 * @param {AbortSignal} signal 
 */
export async function fetchDeckQuestions(actualPath, signal) {
  if (!actualPath) throw new Error("Đường dẫn không hợp lệ");

  // 1. Thử tải từ Backend Vercel / MongoDB trước
  try {
    const vercelRes = await fetch(`/api/questions?deckPath=${encodeURIComponent(actualPath)}`, { signal });
    if (vercelRes.ok) {
      const vercelJson = await vercelRes.json();
      if (vercelJson.success && Array.isArray(vercelJson.data) && vercelJson.data.length > 0) {
        return vercelJson.data.map((q, idx) => ({
          id: q._id || q.qId || `q_${idx}`,
          type: q.type || (Array.isArray(q.options) && q.options.length > 0 ? 'single' : 'short_answer'),
          ...q,
          question: q.question || '',
          answer: q.answer || '',
          explanation: q.explanation || '',
          imageUrl: q.imageUrl || '',
          parsedOptions: Array.isArray(q.options) ? q.options : (q.options ? String(q.options).split('|') : [])
        }));
      }
    }
  } catch (e) {
    console.warn("MongoDB fetch skipped or failed, fallback to Google Apps Script:", e);
  }

  // 2. Dự phòng: Tải từ Google Apps Script nếu MongoDB chưa có dữ liệu đề này
  try {
    const gasRes = await fetch(`${API_CONFIG.QUIZ_DATABASE_URL}?action=getDeck&path=${encodeURIComponent(actualPath)}`, { 
      redirect: "follow",
      credentials: "omit",
      signal
    });
    
    if (gasRes.ok) {
      const rawText = await gasRes.text();
      if (rawText && (rawText.trim().startsWith('[') || rawText.trim().startsWith('{'))) {
        const gasData = JSON.parse(rawText);
        if (Array.isArray(gasData) && gasData.length > 0) {
          return gasData.map((q, idx) => {
            let rawImg = q.imageUrl || q.image || q.img || q.anh || q.hinhAnh || '';
            let questionText = q.question || q.CauHoi || '';
            let vignetteText = q.vignette || q.MoTa || q.vignetteBody || '';
            let rawOptions = q.options || q.choices || '';
            let parsedOpts = [];
            if (rawOptions) {
              parsedOpts = Array.isArray(rawOptions) ? rawOptions : String(rawOptions).split('|').map(s => s.trim()).filter(Boolean);
            }

            let qType = q.type;
            if (!qType) {
              if (parsedOpts.length === 0) qType = 'short_answer';
              else qType = 'single';
            }

            return {
              id: q.id || `q_${idx}`,
              type: qType,
              ...q,
              question: questionText,
              vignette: vignetteText,
              answer: q.answer || q.DapAn || '',
              explanation: q.explanation || q.GiaiThich || q.coche || '',
              source: q.source || q.Nguon || q.reference || '',
              imageUrl: rawImg,
              parsedOptions: parsedOpts
            };
          });
        }
      }
    }
  } catch (e) {
    console.warn("Google Apps Script fetch error, fallback to demo questions:", e);
  }

  // 3. Fallback câu hỏi mẫu phong phú theo chuyên đề
  if (actualPath.includes('thuc-tap-giai-phau') || actualPath.includes('sinh-duc') || actualPath.includes('ong-ben')) {
    return [
      {
        id: 'q_gp_1',
        type: 'short_answer',
        question: 'Chi tiết số 1 là cấu trúc gì?',
        vignette: 'Tiêu bản cắt dọc vùng chậu hông và đáy chậu nam giới.',
        imageUrl: 'https://drive.google.com/thumbnail?id=1Sh-Rc0-5hnEiXyGDbPzPqzZxO3NBH-DOme69uqCTZXs&sz=w1200',
        parsedOptions: [],
        answer: 'Khoang sau xương mu',
        explanation: 'Khoang sau xương mu (khoang Retzius) chứa mô mỡ lỏng lẻo nằm giữa mặt sau xương mu và mặt trước bàng quang.',
        source: 'Thực tập Giải Phẫu Học - ĐH Y Dược'
      },
      {
        id: 'q_gp_2',
        type: 'short_answer',
        question: 'Chi tiết số 2 là cấu trúc gì?',
        vignette: 'Mặt lưng dương vật và các lớp mạch máu nông.',
        parsedOptions: [],
        answer: 'TM mu nông dương vật',
        explanation: 'Tĩnh mạch mu nông dương vật dẫn lưu máu từ da và bao quy đầu đổ về tĩnh mạch thẹn ngoài.',
        source: 'Thực tập Giải Phẫu Học - ĐH Y Dược'
      },
      {
        id: 'q_gp_3',
        type: 'short_answer',
        question: 'Chi tiết số 3 là cấu trúc gì?',
        vignette: 'Cấu trúc cương dương vật.',
        parsedOptions: [],
        answer: 'Vật hang',
        explanation: 'Vật hang gồm hai khối hình trụ nằm ở mặt mu dương vật, chứa các xoang mạch cương.',
        source: 'Thực tập Giải Phẫu Học - ĐH Y Dược'
      },
      {
        id: 'q_gp_4',
        type: 'short_answer',
        question: 'Chi tiết số 4 là cấu trúc gì?',
        vignette: 'Đoạn tận cùng của niệu đạo nam.',
        parsedOptions: [],
        answer: 'Hố thuyền',
        explanation: 'Hố thuyền là đoạn phình to của niệu đạo trước khi mở ra lỗ sáo ở quy đầu.',
        source: 'Thực tập Giải Phẫu Học - ĐH Y Dược'
      },
      {
        id: 'q_gp_5',
        type: 'short_answer',
        question: 'Chi tiết số 5 là cấu trúc gì?',
        vignette: 'Đỉnh quy đầu.',
        parsedOptions: [],
        answer: 'Lỗ sáo',
        explanation: 'Lỗ niệu đạo ngoài (lỗ sáo) là nơi nước tiểu và tinh dịch thoát ra ngoài cơ thể.',
        source: 'Thực tập Giải Phẫu Học - ĐH Y Dược'
      }
    ];
  }

  return [
    {
      id: 'q_demo_1',
      type: 'single',
      question: 'Bệnh nhân nam 58 tuổi, tiền sử tăng huyết áp và hút thuốc lá nhiều năm, nhập viện vì đau thắt ngực dữ dội sau xương ức lan lên hàm dưới và cánh tay trái, kéo dài trên 30 phút. Điện tâm đồ ghi nhận đoạn ST chênh lên ở các chuyển đạo DII, DIII, aVF. Chẩn đoán lâm sàng phù hợp nhất là:',
      vignette: 'Bệnh nhân có biểu hiện đau ngực kiểu mạch vành điển hình kèm thay đổi động học trên ECG các chuyển đạo thành dưới.',
      parsedOptions: [
        'Nhồi máu cơ tim cấp có ST chênh lên (STEMI) thành dưới',
        'Bóc tách động mạch chủ ngực cấp tính type A',
        'Viêm màng ngoài tim cấp tính do virus',
        'Cơn co thắt thực quản lan tỏa'
      ],
      answer: 'Nhồi máu cơ tim cấp có ST chênh lên (STEMI) thành dưới',
      explanation: 'Tam chứng: Đau ngực kiểu mạch vành kéo dài > 20 phút + Yếu tố nguy cơ tim mạch + ST chênh lên ở DII, DIII, aVF (vùng thành dưới do động mạch vành phải RCA chi phối) là tiêu chuẩn vàng chẩn đoán STEMI thành dưới.',
      source: 'Khuyến cáo Hội Tim Mạch Việt Nam & ESC 2023'
    },
    {
      id: 'q_demo_2',
      type: 'single',
      question: 'Cấu trúc giải phẫu nào sau đây đi qua lỗ bịt của xương chậu?',
      vignette: 'Liên quan đến giải phẫu định khu vùng chậu hông và đáy chậu.',
      parsedOptions: [
        'Bó mạch và thần kinh bịt',
        'Thần kinh ngồi (tọa)',
        'Động mạch đùi nông',
        'Bó mạch thừng tinh'
      ],
      answer: 'Bó mạch và thần kinh bịt',
      explanation: 'Ống bịt được giới hạn bởi rãnh bịt của xương mu và bờ trên màng bịt, là nơi đi qua của động mạch, tĩnh mạch và thần kinh bịt từ hố chậu xuống vùng đùi trong.',
      source: 'Giáo trình Giải Phẫu Học Người - GS. Nguyễn Quang Quyền'
    }
  ];
}
