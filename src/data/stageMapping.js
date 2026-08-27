/**
 * Định nghĩa chuẩn hệ thống Phân Khối Đào Tạo Y Khoa (Medical Training Stages)
 * - preclinical: Tiền lâm sàng (Y1 - Y3: Giải phẫu, Sinh lý, Dược lý, Hóa sinh, Mô phôi...)
 * - clinical: Lâm sàng (Y4 - Y6: Nội, Ngoại, Sản, Nhi, Truyền nhiễm, Chẩn đoán hình ảnh...)
 * - postgraduate: Sau đại học (Ôn thi Bác sĩ Nội trú, CKI, CKII, Thạc sĩ Y học)
 * - unclassified: Chưa phân loại (Fallback an toàn)
 */

export const STAGES = {
  ALL: 'all',
  PRECLINICAL: 'preclinical',
  CLINICAL: 'clinical',
  POSTGRADUATE: 'postgraduate',
  UNCLASSIFIED: 'unclassified'
};

export const STAGE_CONFIG = {
  [STAGES.ALL]: {
    id: 'all',
    label: 'Tất cả môn',
    shortLabel: 'Tất cả',
    description: 'Toàn bộ ngân hàng môn học và chuyên khoa y khoa',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    color: '#0ea5e9'
  },
  [STAGES.PRECLINICAL]: {
    id: 'preclinical',
    label: 'Tiền lâm sàng (Y1 - Y3)',
    shortLabel: 'Tiền lâm sàng',
    years: 'Y1 - Y3',
    description: 'Kiến thức y học cơ sở: Giải phẫu, Sinh lý, Hóa sinh, Dược lý, Mô phôi, Vi sinh...',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    color: '#8b5cf6' // Purple/Indigo
  },
  [STAGES.CLINICAL]: {
    id: 'clinical',
    label: 'Lâm sàng (Y4 - Y6)',
    shortLabel: 'Lâm sàng',
    years: 'Y4 - Y6',
    description: 'Kiến thức bệnh học & điều trị: Nội, Ngoại, Sản, Nhi, Cấp cứu, Chẩn đoán hình ảnh...',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    color: '#06b6d4' // Cyan/Teal
  },
  [STAGES.POSTGRADUATE]: {
    id: 'postgraduate',
    label: 'Sau đại học (Nội trú / CKI)',
    shortLabel: 'Sau đại học',
    years: 'Nội trú / CKI / CKII',
    description: 'Ôn thi Bác sĩ Nội trú, Chuyên khoa I, Chuyên khoa II, Đề thi tổng hợp ca bệnh...',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    color: '#f59e0b' // Amber/Gold
  },
  [STAGES.UNCLASSIFIED]: {
    id: 'unclassified',
    label: 'Chưa phân loại',
    shortLabel: 'Khác',
    years: 'Chung',
    description: 'Các môn học và chuyên đề bổ trợ',
    badgeClass: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    color: '#64748b'
  }
};

/**
 * Seed Mapping tĩnh ban đầu cho 24 môn học hiện có.
 * Dùng làm fallback khi Google Sheet chưa bổ sung cột `stage` hoặc `stages`.
 */
export const SUBJECT_STAGE_SEED = {
  // 1. Khối Tiền Lâm Sàng (Y1 - Y3)
  'giai-phau': ['preclinical', 'postgraduate'],
  'thuc-tap-giai-phau': ['preclinical'],
  'sinh-ly': ['preclinical', 'postgraduate'],
  'hoa-sinh': ['preclinical', 'postgraduate'],
  'mo-phoi': ['preclinical'],
  'chay-tram-mo-phoi': ['preclinical'],
  'sinh-ly-benh-mien-dich': ['preclinical', 'postgraduate'],
  'duoc-ly': ['preclinical', 'postgraduate'],
  'vi-sinh': ['preclinical'],
  'ky-sinh-trung': ['preclinical'],
  'sinh-hoc-di-truyen': ['preclinical'],
  'ly-sinh': ['preclinical'],
  'tam-ly-dao-duc': ['preclinical'],
  'phap-luat-y-te': ['preclinical'],
  'phap-luat-dai-cuong': ['preclinical'],
  'lich-su-dang': ['preclinical'],
  'tu-tuong-hcm': ['preclinical'],
  'kinh-te-chinh-tri': ['preclinical'],
  'dieu-duong-co-ban': ['preclinical'],
  'tien-lam-sang-1': ['preclinical'],
  'tien-lam-sang-2': ['preclinical'],
  'giai-phau-rang': ['preclinical'],
  'nhap-mon-rang-ham-mat': ['preclinical'],
  'chua-rang': ['preclinical'],

  // 2. Khối Lâm Sàng (Y4 - Y6)
  'noi-khoa': ['clinical', 'postgraduate'],
  'noi-tim-mach': ['clinical', 'postgraduate'],
  'noi-co-so': ['preclinical', 'clinical', 'postgraduate'],
  'noi-ho-hap': ['clinical', 'postgraduate'],
  'noi-tieu-hoa': ['clinical', 'postgraduate'],
  'ngoai-khoa': ['clinical', 'postgraduate'],
  'ngoai-co-xuong': ['clinical', 'postgraduate'],
  'san-khoa': ['clinical', 'postgraduate'],
  'san-1': ['clinical'],
  'san-2': ['clinical', 'postgraduate'],
  'nhi-khoa': ['clinical', 'postgraduate'],
  'truyen-nhiem': ['clinical', 'postgraduate'],
  'hoi-suc-cap-cuu': ['clinical', 'postgraduate'],
  'chan-doan-hinh-anh': ['clinical', 'postgraduate']
};

/**
 * Hàm phân giải danh sách stages cho một môn học:
 * 1. Ưu tiên lấy từ `subject.stages` (dạng Array) nếu có từ API/Sheet
 * 2. Lấy từ `subject.stage` (dạng String phân tách bằng dấu phẩy) nếu có
 * 3. Tra cứu theo `subject.id` trong seed mapping
 * 4. Fallback: ['unclassified']
 */
export function resolveSubjectStages(subject) {
  if (!subject) return [STAGES.UNCLASSIFIED];

  // 1. Đã có mảng stages từ API
  if (Array.isArray(subject.stages) && subject.stages.length > 0) {
    return subject.stages.filter(s => Object.values(STAGES).includes(s));
  }

  // 2. Có chuỗi stage từ Sheet (ví dụ "preclinical,clinical")
  if (typeof subject.stage === 'string' && subject.stage.trim()) {
    const parsed = subject.stage
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(s => Object.values(STAGES).includes(s));
    if (parsed.length > 0) return parsed;
  }

  // 3. Tra cứu theo subject.id trong Seed Mapping
  const sId = subject.id || '';
  if (SUBJECT_STAGE_SEED[sId]) {
    return SUBJECT_STAGE_SEED[sId];
  }

  // 4. Normalize tên môn học để so khớp phụ
  const normalizedName = (subject.name || '').toLowerCase().trim();
  for (const [key, stages] of Object.entries(SUBJECT_STAGE_SEED)) {
    if (normalizedName.includes(key.replace(/-/g, ' '))) {
      return stages;
    }
  }

  // 5. Fallback an toàn
  return [STAGES.UNCLASSIFIED];
}

/**
 * Dev-only Coverage Checker:
 * Kiểm tra xem có môn học nào trong manifest bị thiếu mapping stage hay không.
 */
export function checkStageCoverage(subjects = []) {
  if (!import.meta.env.DEV || !Array.isArray(subjects)) return;

  const unclassified = subjects.filter(s => {
    const stages = resolveSubjectStages(s);
    return stages.includes(STAGES.UNCLASSIFIED);
  });

  if (unclassified.length > 0) {
    console.warn(
      `[StageCoverage Warning] Có ${unclassified.length} môn học chưa được phân loại Stage trong Seed Mapping:`,
      unclassified.map(s => ({ id: s.id, name: s.name }))
    );
  }
}
