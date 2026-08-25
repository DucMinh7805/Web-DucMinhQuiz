// Bảng trị số xét nghiệm y khoa tiêu chuẩn tham khảo (Lab Reference Values)
export const LAB_CATEGORIES = [
  {
    id: 'hematology',
    name: 'Huyết học (Complete Blood Count)',
    tests: [
      { name: 'Hồng cầu (RBC)', normal: 'Nam: 4.2 - 5.8 T/L; Nữ: 3.8 - 5.0 T/L', unit: 'x 10^12/L', notes: 'Giảm trong thiếu máu, suy tủy; Tăng trong đa hồng cầu' },
      { name: 'Hemoglobin (Hb)', normal: 'Nam: 130 - 180 g/L; Nữ: 120 - 165 g/L', unit: 'g/L', notes: '< 120 g/L chẩn đoán thiếu máu (nữ), < 130 g/L (nam)' },
      { name: 'Hematocrit (Hct)', normal: 'Nam: 38 - 50%; Nữ: 35 - 45%', unit: '%', notes: 'Tỷ lệ thể tích hồng cầu/máu toàn phần' },
      { name: 'Bạch cầu (WBC)', normal: '4.0 - 10.0 G/L', unit: 'x 10^9/L', notes: 'Tăng trong nhiễm trùng cấp, viêm, ung thư máu' },
      { name: 'Bạch cầu đa nhân trung tính (Neutrophil)', normal: '40 - 74% (2.0 - 7.5 G/L)', unit: '%', notes: 'Tăng điển hình trong nhiễm trùng do vi khuẩn' },
      { name: 'Bạch cầu Lympho (Lymphocyte)', normal: '20 - 45% (1.0 - 4.0 G/L)', unit: '%', notes: 'Tăng trong nhiễm virus, lao, bạch cầu mạn' },
      { name: 'Bạch cầu ái toan (Eosinophil)', normal: '0.5 - 5% (0.04 - 0.5 G/L)', unit: '%', notes: 'Tăng trong dị ứng, nhiễm ký sinh trùng' },
      { name: 'Tiểu cầu (PLT)', normal: '150 - 450 G/L', unit: 'x 10^9/L', notes: '< 100 G/L: Giảm tiểu cầu; < 50 G/L: Nguy cơ xuất huyết' },
    ]
  },
  {
    id: 'biochemistry',
    name: 'Sinh hóa & Chức năng Gan - Thận',
    tests: [
      { name: 'Glucose máu lúc đói', normal: '3.9 - 6.4 mmol/L (70 - 115 mg/dL)', unit: 'mmol/L', notes: '≥ 7.0 mmol/L lúc đói: Chẩn đoán Đái tháo đường' },
      { name: 'HbA1c', normal: '< 5.7% (Bình thường); 5.7 - 6.4% (Tiền ĐTĐ); ≥ 6.5% (ĐTĐ)', unit: '%', notes: 'Đánh giá đường huyết trung bình trong 3 tháng' },
      { name: 'Urea (Ure máu)', normal: '2.5 - 7.5 mmol/L (15 - 45 mg/dL)', unit: 'mmol/L', notes: 'Tăng trong suy thận, xuất huyết tiêu hóa, tăng dị hóa' },
      { name: 'Creatinine huyết thanh', normal: 'Nam: 62 - 106 µmol/L; Nữ: 44 - 80 µmol/L', unit: 'µmol/L', notes: 'Dùng để ước tính mức lọc cầu thận (eGFR)' },
      { name: 'eGFR (Mức lọc cầu thận)', normal: '≥ 90 mL/min/1.73m²', unit: 'mL/min', notes: '< 60 mL/min kéo dài > 3 tháng: Bệnh thận mạn' },
      { name: 'AST (GOT)', normal: '< 35 U/L (Nam); < 31 U/L (Nữ)', unit: 'U/L', notes: 'Tăng mạnh trong tổn thương gan cấp, nhồi máu cơ tim' },
      { name: 'ALT (GPT)', normal: '< 41 U/L (Nam); < 31 U/L (Nữ)', unit: 'U/L', notes: 'Đặc hiệu cho tổn thương tế bào gan hơn AST' },
      { name: 'Bilirubin toàn phần', normal: '< 17.1 µmol/L (< 1.0 mg/dL)', unit: 'µmol/L', notes: '> 34 µmol/L (2.0 mg/dL) bắt đầu có vàng da trên lâm sàng' },
      { name: 'Bilirubin trực tiếp', normal: '< 4.3 µmol/L (< 0.25 mg/dL)', unit: 'µmol/L', notes: 'Tăng trong vàng da ứ mật, tắc mật' },
      { name: 'Albumin huyết thanh', normal: '35 - 50 g/L (3.5 - 5.0 g/dL)', unit: 'g/L', notes: 'Giảm trong suy dinh dưỡng, xơ gan, hội chứng thận hư' },
    ]
  },
  {
    id: 'electrolytes',
    name: 'Điện giải đồ (Electrolytes)',
    tests: [
      { name: 'Natri (Na+)', normal: '135 - 145 mmol/L', unit: 'mmol/L', notes: 'Hạ Natri gây phù não, co giật; Tăng Natri gây mất nước tế bào' },
      { name: 'Kali (K+)', normal: '3.5 - 5.0 mmol/L', unit: 'mmol/L', notes: 'Nguy hiểm trên tim: < 3.0 (sóng U, loạn nhịp), > 6.0 (T nhọn, ngừng tim)' },
      { name: 'Clo (Cl-)', normal: '96 - 106 mmol/L', unit: 'mmol/L', notes: 'Dùng tính khoảng trống Anion gap = Na - (Cl + HCO3)' },
      { name: 'Canxi toàn phần (Ca2+)', normal: '2.15 - 2.55 mmol/L (8.6 - 10.2 mg/dL)', unit: 'mmol/L', notes: 'Cần hiệu chỉnh theo Albumin: Ca_hc = Ca_tp + 0.8*(40 - Albumin)/10' },
      { name: 'Canxi ion hóa (Ca2+ ion)', normal: '1.15 - 1.30 mmol/L', unit: 'mmol/L', notes: 'Dạng canxi có hoạt tính sinh học' },
    ]
  },
  {
    id: 'cardiac_abg',
    name: 'Khí máu & Men tim (ABG & Cardiac Markers)',
    tests: [
      { name: 'pH máu động mạch', normal: '7.35 - 7.45', unit: '', notes: '< 7.35: Toan máu; > 7.45: Kiềm máu' },
      { name: 'PaCO2 (Áp lực riêng phần CO2)', normal: '35 - 45 mmHg', unit: 'mmHg', notes: 'Thông số hô hấp: Tăng -> Toan hô hấp; Giảm -> Kiềm hô hấp' },
      { name: 'HCO3- (Bicarbonate)', normal: '22 - 26 mmol/L', unit: 'mmol/L', notes: 'Thông số chuyển hóa: Giảm -> Toan chuyển hóa; Tăng -> Kiềm chuyển hóa' },
      { name: 'PaO2 (Áp lực riêng phần O2)', normal: '80 - 100 mmHg', unit: 'mmHg', notes: '< 60 mmHg: Suy hô hấp giảm oxy máu' },
      { name: 'Troponin T / I (hs-cTn)', normal: 'hs-cTnT < 14 ng/L (hoặc tùy kit xét nghiệm)', unit: 'ng/L', notes: 'Tiêu chuẩn vàng chẩn đoán hoại tử tế bào cơ tim (NMCT)' },
      { name: 'NT-proBNP / BNP', normal: 'NT-proBNP < 125 pg/mL (< 75t)', unit: 'pg/mL', notes: 'Dấu ấn căng thành cơ tim, chẩn đoán & tiên lượng suy tim' },
      { name: 'D-Dimer', normal: '< 500 ng/mL FEU', unit: 'ng/mL', notes: 'Giá trị dự đoán âm tính cao để loại trừ Thuyên tắc phổi (PE) & DVT' },
    ]
  }
];
