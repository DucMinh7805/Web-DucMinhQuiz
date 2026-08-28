/**
 * Định nghĩa chuẩn hệ thống Phân Khối Đào Tạo Y Khoa (Medical Training Stages)
 * - preclinical: Tiền lâm sàng (Y1 - Y3: Giải phẫu, Sinh lý, Dược lý, Hóa sinh, Mô phôi, Lý sinh, Triết học...)
 * - clinical: Lâm sàng (Y4 - Y6: Nội, Ngoại, Sản, Nhi, Truyền nhiễm, Chẩn đoán hình ảnh...)
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
    label: 'Tiền lâm sàng (Y1 - Y3)',
    shortLabel: 'Tiền lâm sàng',
    years: 'Y1 - Y3',
    description: 'Kiến thức y học cơ sở & đại cương: Giải phẫu, Sinh lý, Hóa sinh, Dược lý, Mô phôi, Lý sinh, Chính trị...',
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
  'noi-co-so': ['preclinical', 'clinical'],
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

/**
 * Hàm phân giải danh sách stages cho một môn học:
 */
export function resolveSubjectStages(subject) {
  if (!subject) return [STAGES.ALL];

  // 1. Đã có mảng stages từ API
  if (Array.isArray(subject.stages) && subject.stages.length > 0) {
    const valid = subject.stages.filter(s => Object.values(STAGES).includes(s));
    if (valid.length > 0) return valid;
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

  const rawName = stripAccents(subject.name || '');
  const catId = stripAccents(subject.categoryId || '');
  const catName = stripAccents(subject.categoryName || '');

  // 4. Nhận diện khối Tiền Lâm Sàng (Y1 - Y3)
  const isPreclinical = 
    catId.includes('co-so') || 
    catName.includes('co so') || 
    catName.includes('dai cuong') ||
    rawName.includes('giai phau') || 
    rawName.includes('sinh ly') || 
    rawName.includes('hoa sinh') || 
    rawName.includes('duoc') || 
    rawName.includes('mo phoi') || 
    rawName.includes('vi sinh') || 
    rawName.includes('ky sinh') || 
    rawName.includes('ly sinh') || 
    rawName.includes('di truyen') || 
    rawName.includes('chinh tri') || 
    rawName.includes('lich su') || 
    rawName.includes('dang') || 
    rawName.includes('xa hoi') || 
    rawName.includes('tu tuong') || 
    rawName.includes('triet') || 
    rawName.includes('phap luat') || 
    rawName.includes('dieu duong') || 
    rawName.includes('tien lam sang');

  // 5. Nhận diện khối Lâm Sàng (Y4 - Y6)
  const isClinical = 
    catId.includes('noi') || 
    catId.includes('ngoai') || 
    catId.includes('san') || 
    catId.includes('nhi') || 
    catName.includes('noi') || 
    catName.includes('ngoai') || 
    catName.includes('san') || 
    catName.includes('nhi') || 
    rawName.includes('noi') || 
    rawName.includes('ngoai') || 
    rawName.includes('san') || 
    rawName.includes('nhi') || 
    rawName.includes('tim mach') || 
    rawName.includes('ho hap') || 
    rawName.includes('tieu hoa') || 
    rawName.includes('co xuong') || 
    rawName.includes('truyen nhiem') || 
    rawName.includes('hoi suc') || 
    rawName.includes('cap cuu') || 
    rawName.includes('chan doan') || 
    rawName.includes('mat') || 
    rawName.includes('tai mui hong') || 
    rawName.includes('rang');

  const result = [];
  if (isPreclinical) result.push(STAGES.PRECLINICAL);
  if (isClinical) result.push(STAGES.CLINICAL);

  if (result.length > 0) return result;

  return [STAGES.PRECLINICAL];
}

export function checkStageCoverage(subjects = []) {
  // Safe helper
}
