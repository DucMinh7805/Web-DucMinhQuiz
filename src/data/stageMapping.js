/**
 * Định nghĩa chuẩn hệ thống Phân Khối Đào Tạo Y Khoa (Medical Training Stages)
 * - preclinical: Nền tảng & tiền lâm sàng (Y1 - Y3)
 * - clinical: Lâm sàng (Y4 - Y6)
 * - unclassified: Chưa phân loại (Fallback an toàn)
 */

export const STAGES = {
  ALL: 'all',
  PRECLINICAL: 'preclinical',
  CLINICAL: 'clinical',
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
    label: 'Nền tảng & tiền lâm sàng (Y1 - Y3)',
    shortLabel: 'Y1 - Y3',
    years: 'Y1 - Y3',
    description: 'Kiến thức Y học cơ sở & đại cương: Giải phẫu, Sinh lý, Hóa sinh, Dược lý, Mô phôi, Lý sinh, Chính trị...',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    color: '#8b5cf6'
  },
  [STAGES.CLINICAL]: {
    id: 'clinical',
    label: 'Lâm sàng (Y4 - Y6)',
    shortLabel: 'Lâm sàng',
    years: 'Y4 - Y6',
    description: 'Kiến thức bệnh học & điều trị: Nội, Ngoại, Sản, Nhi, Cấp cứu, Chẩn đoán hình ảnh...',
    badgeClass: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    color: '#06b6d4'
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
 * Seed Mapping tĩnh ban đầu cho các môn học chuẩn.
 */
export const SUBJECT_STAGE_SEED = {
  // 1. Khối Tiền Lâm Sàng (Y1 - Y3)
  'giai-phau': ['preclinical'],
  'thuc-tap-giai-phau': ['preclinical'],
  'sinh-ly': ['preclinical'],
  'hoa-sinh': ['preclinical'],
  'mo-phoi': ['preclinical'],
  'chay-tram-mo-phoi': ['preclinical'],
  'sinh-ly-benh-mien-dich': ['preclinical'],
  'duoc-ly': ['preclinical'],
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
  'chu-nghia-xa-hoi': ['preclinical'],
  'triet-hoc': ['preclinical'],
  'dieu-duong-co-ban': ['preclinical'],
  'tien-lam-sang-1': ['preclinical'],
  'tien-lam-sang-2': ['preclinical'],
  'giai-phau-rang': ['preclinical'],
  'nhap-mon-rang-ham-mat': ['preclinical'],
  'chua-rang': ['preclinical'],

  // 2. Khối Lâm Sàng (Y4 - Y6)
  'noi-khoa': ['clinical'],
  'noi-tim-mach': ['clinical'],
  'noi-co-so': ['preclinical'],
  'noi-ho-hap': ['clinical'],
  'noi-tieu-hoa': ['clinical'],
  'ngoai-khoa': ['clinical'],
  'ngoai-co-xuong': ['clinical'],
  'san-khoa': ['clinical'],
  'san-1': ['clinical'],
  'san-2': ['clinical'],
  'nhi-khoa': ['clinical'],
  'truyen-nhiem': ['clinical'],
  'hoi-suc-cap-cuu': ['clinical'],
  'chan-doan-hinh-anh': ['clinical']
};

function stripAccents(str = '') {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function normalizeSubjectId(value = '') {
  return stripAccents(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function includesPhrase(value, phrase) {
  return (` ${value} `).includes(` ${phrase} `);
}

function parseStageValue(value) {
  const normalized = stripAccents(String(value || '')).replace(/[^a-z0-9]+/g, '');
  if (!normalized) return null;

  if (
    normalized === STAGES.PRECLINICAL ||
    normalized.includes('tienlamsang') ||
    normalized.includes('y1y3') ||
    ['y1', 'y2', 'y3'].includes(normalized)
  ) {
    return STAGES.PRECLINICAL;
  }

  if (
    normalized === STAGES.CLINICAL ||
    normalized.includes('lamsang') ||
    normalized.includes('y4y6') ||
    ['y4', 'y5', 'y6'].includes(normalized)
  ) {
    return STAGES.CLINICAL;
  }

  if (normalized === STAGES.UNCLASSIFIED) return STAGES.UNCLASSIFIED;
  return null;
}

/**
 * Hàm phân giải danh sách stages cho một môn học:
 */
export function resolveSubjectStages(subject) {
  if (!subject) return [STAGES.UNCLASSIFIED];

  // 1. Ưu tiên phân khối tường minh. Nếu API gửi đồng thời cả hai khối
  // (dữ liệu mặc định/xung đột), bỏ qua và phân loại lại theo môn học bên dưới.
  const explicitValues = [
    ...(Array.isArray(subject.stages) ? subject.stages : []),
    ...(typeof subject.stage === 'string' ? subject.stage.split(',') : [])
  ];
  const explicitStages = Array.from(new Set(explicitValues.map(parseStageValue).filter(Boolean)));
  if (explicitStages.length === 1) return explicitStages;

  // 2. Tra cứu theo subject.id trong Seed Mapping (không phụ thuộc hoa/thường,
  // dấu gạch dưới hay dấu gạch ngang từ Sheet).
  const sId = normalizeSubjectId(subject.id || subject.code || '');
  if (SUBJECT_STAGE_SEED[sId]) {
    return SUBJECT_STAGE_SEED[sId];
  }

  const rawName = stripAccents(subject.name || '');
  const catId = stripAccents(subject.categoryId || '').replace(/[_-]+/g, ' ');
  const catName = stripAccents(subject.categoryName || '').replace(/[_-]+/g, ' ');

  // 4. Nhận diện khối Tiền Lâm Sàng (Y1 - Y3)
  const isPreclinicalCategory = [catId, catName].some(value =>
    includesPhrase(value, 'co so') ||
    includesPhrase(value, 'dai cuong') ||
    includesPhrase(value, 'tien lam sang') ||
    includesPhrase(value, 'nen tang')
  );
  const isPreclinicalSubject = [
    'giai phau', 'sinh ly', 'hoa sinh', 'duoc ly', 'mo phoi', 'vi sinh',
    'ky sinh', 'ly sinh', 'di truyen', 'chinh tri', 'lich su dang',
    'chu nghia xa hoi', 'tu tuong', 'triet hoc', 'phap luat',
    'dieu duong co ban', 'tien lam sang'
  ].some(phrase => includesPhrase(rawName, phrase));

  // 5. Nhận diện khối Lâm Sàng (Y4 - Y6)
  const clinicalPhrases = [
    'noi', 'ngoai', 'san', 'nhi', 'tim mach', 'ho hap', 'tieu hoa',
    'co xuong', 'truyen nhiem', 'hoi suc', 'cap cuu', 'chan doan hinh anh',
    'mat', 'tai mui hong', 'rang ham mat'
  ];
  const isClinicalSubject = clinicalPhrases.some(phrase => includesPhrase(rawName, phrase));
  const isClinicalCategory = !isPreclinicalCategory && [catId, catName].some(value =>
    clinicalPhrases.some(phrase => includesPhrase(value, phrase))
  );

  // Tên môn lâm sàng cụ thể được ưu tiên; nếu tên không đủ rõ thì danh mục
  // “cơ sở/tiền lâm sàng” giữ môn ở đúng khối Y1–Y3.
  if (isClinicalSubject) return [STAGES.CLINICAL];
  if (isPreclinicalCategory || isPreclinicalSubject) return [STAGES.PRECLINICAL];
  if (isClinicalCategory) return [STAGES.CLINICAL];

  // Không âm thầm đưa môn chưa rõ vào Y1 - Y3.
  return [STAGES.UNCLASSIFIED];
}

export function checkStageCoverage(subjects = []) {
  return subjects.reduce((coverage, subject) => {
    resolveSubjectStages(subject).forEach(stage => {
      coverage[stage] = (coverage[stage] || 0) + 1;
    });
    return coverage;
  }, {});
}
