/**
 * =========================================================================
 * BẢNG DỮ LIỆU TRỊ SỐ XÉT NGHIỆM Y KHOA (LAB REFERENCE VALUES)
 * =========================================================================
 * HƯỚNG DẪN TỰ CHỈNH SỬA / THÊM MỚI DỮ LIỆU:
 * Bạn có thể dễ dàng thay đổi số liệu, tên xét nghiệm hoặc thêm ảnh bằng cách sửa các object bên dưới:
 * 
 * {
 *   id: 'ma_xet_nghiem',               // Mã xét nghiệm (viết liền không dấu)
 *   name: 'Tên xét nghiệm',             // Tên hiển thị (VD: 'Hemoglobin (Hb)')
 *   normal: 'Khoảng tham chiếu',        // Trị số (VD: 'Nam: 130 - 180 g/L; Nữ: 120 - 165 g/L')
 *   unit: 'Đơn vị đo',                  // Đơn vị (VD: 'g/L', 'mmol/L', '%')
 *   notes: 'Ý nghĩa lâm sàng tóm tắt',  // Ghi chú khi tăng/giảm trong bệnh lý
 *   image: '/images/xet-nghiem-1.png'   // Link ảnh hoặc file trong thư mục /public (tùy chọn)
 * }
 */

export const LAB_CATEGORIES = [
  {
    id: 'hematology',
    name: 'Huyết học',
    subtitle: 'Công thức máu toàn phần (CBC)',
    image: '',
    tests: [
      { 
        id: 'rbc',
        name: 'Hồng cầu (RBC)', 
        normal: 'Nam: 4.2 - 5.8 | Nữ: 3.8 - 5.0', 
        unit: 'x 10¹²/L', 
        notes: 'Giảm trong thiếu máu, suy tủy; Tăng trong đa hồng cầu, mất nước.',
        image: ''
      },
      { 
        id: 'hb',
        name: 'Hemoglobin (Hb)', 
        normal: 'Nam: 130 - 180 | Nữ: 120 - 165', 
        unit: 'g/L', 
        notes: '< 120 g/L chẩn đoán thiếu máu (nữ), < 130 g/L (nam).',
        image: ''
      },
      { 
        id: 'hct',
        name: 'Hematocrit (Hct)', 
        normal: 'Nam: 38 - 50% | Nữ: 35 - 45%', 
        unit: '%', 
        notes: 'Tỷ lệ thể tích hồng cầu/máu toàn phần. Giảm trong mất máu, tan máu.',
        image: ''
      },
      { 
        id: 'wbc',
        name: 'Bạch cầu (WBC)', 
        normal: '4.0 - 10.0', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng trong nhiễm trùng cấp, phản ứng viêm, bệnh bạch cầu.',
        image: ''
      },
      { 
        id: 'neu',
        name: 'Bạch cầu Neutrophil', 
        normal: '40 - 74% (2.0 - 7.5)', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng điển hình trong các nhiễm trùng do vi khuẩn cấp tính.',
        image: ''
      },
      { 
        id: 'lym',
        name: 'Bạch cầu Lymphocyte', 
        normal: '20 - 45% (1.0 - 4.0)', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng trong nhiễm trùng virus, lao mạn tính, bệnh bạch cầu lympho.',
        image: ''
      },
      { 
        id: 'eos',
        name: 'Bạch cầu Eosinophil', 
        normal: '0.5 - 5% (0.04 - 0.5)', 
        unit: 'x 10⁹/L', 
        notes: 'Tăng trong các bệnh dị ứng, hen phế quản, nhiễm ký sinh trùng.',
        image: ''
      },
      { 
        id: 'plt',
        name: 'Tiểu cầu (PLT)', 
        normal: '150 - 450', 
        unit: 'x 10⁹/L', 
        notes: '< 100 G/L: Giảm tiểu cầu; < 50 G/L: Nguy cơ xuất huyết tự phát.',
        image: ''
      }
    ]
  },
  {
    id: 'biochemistry',
    name: 'Sinh hóa Gan - Thận',
    subtitle: 'Chức năng chuyển hóa & men gan',
    image: '',
    tests: [
      { 
        id: 'glucose',
        name: 'Glucose máu lúc đói', 
        normal: '3.9 - 6.4 (70 - 115 mg/dL)', 
        unit: 'mmol/L', 
        notes: '≥ 7.0 mmol/L lúc đói: Tiêu chuẩn chẩn đoán Đái tháo đường.',
        image: ''
      },
      { 
        id: 'hba1c',
        name: 'HbA1c', 
        normal: '< 5.7% (Bình thường) | ≥ 6.5% (ĐTĐ)', 
        unit: '%', 
        notes: 'Phản ánh mức đường huyết trung bình trong 2-3 tháng gần nhất.',
        image: ''
      },
      { 
        id: 'ure',
        name: 'Urea (Ure máu)', 
        normal: '2.5 - 7.5 (15 - 45 mg/dL)', 
        unit: 'mmol/L', 
        notes: 'Tăng trong suy giảm chức năng thận, xuất huyết tiêu hóa cao.',
        image: ''
      },
      { 
        id: 'creatinine',
        name: 'Creatinine huyết thanh', 
        normal: 'Nam: 62 - 106 | Nữ: 44 - 80', 
        unit: 'µmol/L', 
        notes: 'Chỉ số quan trọng đánh giá mức lọc cầu thận (eGFR).',
        image: ''
      },
      { 
        id: 'egfr',
        name: 'Mức lọc cầu thận (eGFR)', 
        normal: '≥ 90', 
        unit: 'mL/min/1.73m²', 
        notes: '< 60 kéo dài > 3 tháng: Phù hợp tiêu chuẩn Bệnh thận mạn.',
        image: ''
      },
      { 
        id: 'ast',
        name: 'AST (GOT)', 
        normal: 'Nam: < 35 | Nữ: < 31', 
        unit: 'U/L', 
        notes: 'Tăng trong hoại tử tế bào gan, viêm gan cấp, nhồi máu cơ tim.',
        image: ''
      },
      { 
        id: 'alt',
        name: 'ALT (GPT)', 
        normal: 'Nam: < 41 | Nữ: < 31', 
        unit: 'U/L', 
        notes: 'Chỉ số có độ đặc hiệu cao hơn cho tổn thương tế bào gan.',
        image: ''
      },
      { 
        id: 'bilitp',
        name: 'Bilirubin toàn phần', 
        normal: '< 17.1 (< 1.0 mg/dL)', 
        unit: 'µmol/L', 
        notes: '> 34 µmol/L (2 mg/dL) bắt đầu quan sát thấy vàng da trên lâm sàng.',
        image: ''
      },
      { 
        id: 'bilitr',
        name: 'Bilirubin trực tiếp', 
        normal: '< 4.3 (< 0.25 mg/dL)', 
        unit: 'µmol/L', 
        notes: 'Tăng ưu thế trong các bệnh lý tắc mật, ứ mật trong/ngoài gan.',
        image: ''
      },
      { 
        id: 'albumin',
        name: 'Albumin huyết thanh', 
        normal: '35 - 50 (3.5 - 5.0 g/dL)', 
        unit: 'g/L', 
        notes: 'Giảm trong suy dinh dưỡng nặng, xơ gan mất bù, hội chứng thận hư.',
        image: ''
      }
    ]
  },
  {
    id: 'electrolytes',
    name: 'Điện giải đồ',
    subtitle: 'Nồng độ ion huyết tương',
    image: '',
    tests: [
      { 
        id: 'na',
        name: 'Natri (Na⁺)', 
        normal: '135 - 145', 
        unit: 'mmol/L', 
        notes: 'Hạ Natri gây phù não, co giật; Tăng Natri gây teo mất nước tế bào.',
        image: ''
      },
      { 
        id: 'k',
        name: 'Kali (K⁺)', 
        normal: '3.5 - 5.0', 
        unit: 'mmol/L', 
        notes: 'Nguy cơ loạn nhịp tim: < 3.0 (sóng U), > 6.0 (sóng T nhọn, ngừng tim).',
        image: ''
      },
      { 
        id: 'cl',
        name: 'Clo (Cl⁻)', 
        normal: '96 - 106', 
        unit: 'mmol/L', 
        notes: 'Dùng để tính khoảng trống Anion gap = Na - (Cl + HCO3).',
        image: ''
      },
      { 
        id: 'ca_tp',
        name: 'Canxi toàn phần (Ca²⁺)', 
        normal: '2.15 - 2.55 (8.6 - 10.2 mg/dL)', 
        unit: 'mmol/L', 
        notes: 'Cần hiệu chỉnh theo Albumin: Ca_hc = Ca_tp + 0.8 * (40 - Albumin)/10.',
        image: ''
      },
      { 
        id: 'ca_ion',
        name: 'Canxi ion hóa (Ca²⁺ ion)', 
        normal: '1.15 - 1.30', 
        unit: 'mmol/L', 
        notes: 'Dạng canxi tự do có hoạt tính sinh học chính trong cơ thể.',
        image: ''
      }
    ]
  },
  {
    id: 'cardiac_abg',
    name: 'Khí máu & Men tim',
    subtitle: 'Đánh giá thăng bằng kiềm toan & tim mạch',
    image: '',
    tests: [
      { 
        id: 'ph',
        name: 'pH máu động mạch', 
        normal: '7.35 - 7.45', 
        unit: '', 
        notes: '< 7.35: Toan máu; > 7.45: Kiềm máu.',
        image: ''
      },
      { 
        id: 'paco2',
        name: 'PaCO₂', 
        normal: '35 - 45', 
        unit: 'mmHg', 
        notes: 'Thông số hô hấp: Tăng -> Toan hô hấp; Giảm -> Kiềm hô hấp.',
        image: ''
      },
      { 
        id: 'hco3',
        name: 'HCO₃⁻ (Bicarbonate)', 
        normal: '22 - 26', 
        unit: 'mmol/L', 
        notes: 'Thông số chuyển hóa: Giảm -> Toan chuyển hóa; Tăng -> Kiềm chuyển hóa.',
        image: ''
      },
      { 
        id: 'pao2',
        name: 'PaO₂', 
        normal: '80 - 100', 
        unit: 'mmHg', 
        notes: '< 60 mmHg: Phù hợp giảm oxy máu động mạch (Suy hô hấp).',
        image: ''
      },
      { 
        id: 'trop',
        name: 'Troponin T / I (hs-cTn)', 
        normal: '< 14', 
        unit: 'ng/L', 
        notes: 'Dấu ấn đặc hiệu hoại tử cơ tim trong Hội chứng vành cấp.',
        image: ''
      },
      { 
        id: 'bnp',
        name: 'NT-proBNP', 
        normal: '< 125 (< 75 tuổi)', 
        unit: 'pg/mL', 
        notes: 'Dấu ấn căng thành cơ tim, hỗ trợ chẩn đoán & tiên lượng suy tim.',
        image: ''
      },
      { 
        id: 'ddimer',
        name: 'D-Dimer', 
        normal: '< 500', 
        unit: 'ng/mL FEU', 
        notes: 'Giá trị dự đoán âm tính cao để loại trừ Thuyên tắc phổi (PE) & DVT.',
        image: ''
      }
    ]
  }
];
