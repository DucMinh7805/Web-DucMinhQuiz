/**
 * Dữ liệu Môn Học Mẫu Mặc Định (Default Sample Manifest)
 * - Tự động hiển thị tức thì khi tải trang mà không cần chờ Google Sheet (0.05s load)
 * - Đầy đủ 5 khối chuyên khoa và hơn 20 môn học chuẩn Y khoa Việt Nam để test đồ thị và thẻ bài
 */

export const DEFAULT_SAMPLE_MANIFEST = {
  subjects: [
    // 1. Khối Cơ Sở Ngành / Tiền Lâm Sàng (Y1 - Y3)
    {
      id: 'giai-phau',
      name: 'Giải Phẫu Học',
      code: 'MED101',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical', 'postgraduate'],
      description: 'Cấu trúc hình thái học cơ thể người, các hệ cơ quan, mạch máu và thần kinh.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Giải phẫu chi trên & chi dưới', questionCount: 40, path: 'y-khoa/giai-phau/de-1' },
        { id: 'de-2', name: 'Đề 2 - Giải phẫu lồng ngực & tim phổi', questionCount: 35, path: 'y-khoa/giai-phau/de-2' },
        { id: 'de-3', name: 'Đề 3 - Giải phẫu hệ thần kinh trung ương', questionCount: 45, path: 'y-khoa/giai-phau/de-3' }
      ]
    },
    {
      id: 'thuc-tap-giai-phau',
      name: 'Thực Tập Giải Phẫu',
      code: 'MED102',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical'],
      description: 'Nhận diện chi tiết mốc giải phẫu trên tiêu bản mô hình và xác.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Nhận diện ống bẹn & sinh dục nam', questionCount: 30, path: 'y-khoa/thuc-tap-giai-phau/de-1' }
      ]
    },
    {
      id: 'sinh-ly',
      name: 'Sinh Lý Học',
      code: 'MED103',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical', 'postgraduate'],
      description: 'Cơ chế hoạt động chức năng của tế bào, cơ quan và các hệ thống điều hòa nội môi.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Sinh lý tuần hoàn & huyết áp', questionCount: 40, path: 'y-khoa/sinh-ly/de-1' },
        { id: 'de-2', name: 'Đề 2 - Sinh lý hô hấp & trao đổi khí', questionCount: 35, path: 'y-khoa/sinh-ly/de-2' }
      ]
    },
    {
      id: 'hoa-sinh',
      name: 'Hóa Sinh Y Học',
      code: 'MED104',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical', 'postgraduate'],
      description: 'Chuyển hóa glucid, lipid, protid, năng lượng sinh học và enzym học lâm sàng.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Chuyển hóa năng lượng & chu trình Krebs', questionCount: 30, path: 'y-khoa/hoa-sinh/de-1' }
      ]
    },
    {
      id: 'mo-phoi',
      name: 'Mô Phôi Học',
      code: 'MED105',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical'],
      description: 'Cấu trúc vi thể của biểu mô, mô liên kết, mô cơ, thần kinh và sự phát triển phôi thai.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Bốn loại mô cơ bản', questionCount: 25, path: 'y-khoa/mo-phoi/de-1' }
      ]
    },
    {
      id: 'sinh-ly-benh-mien-dich',
      name: 'Sinh Lý Bệnh - Miễn Dịch',
      code: 'MED106',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical', 'postgraduate'],
      description: 'Cơ chế bệnh sinh các hội chứng viêm, sốt, rối loạn tuần hoàn và đáp ứng miễn dịch.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Quá trình viêm & hóa ứng động bạch cầu', questionCount: 35, path: 'y-khoa/sinh-ly-benh-mien-dich/de-1' }
      ]
    },
    {
      id: 'duoc-ly',
      name: 'Dược Lý Học',
      code: 'MED107',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical', 'postgraduate'],
      description: 'Dược động học, dược lực học, các nhóm thuốc kháng sinh, tim mạch, thần kinh.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Kháng sinh & cơ chế kháng thuốc', questionCount: 40, path: 'y-khoa/duoc-ly/de-1' }
      ]
    },
    {
      id: 'sinh-hoc-di-truyen',
      name: 'Sinh Học Di Truyền',
      code: 'MED108',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical'],
      description: 'Di truyền đơn gen, đa gen, đột biến nhiễm sắc thể và tư vấn di truyền y học.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Đột biến NST & bệnh Down, Turner', questionCount: 25, path: 'y-khoa/sinh-hoc-di-truyen/de-1' }
      ]
    },
    {
      id: 'ly-sinh',
      name: 'Lý Sinh Y Học',
      code: 'MED109',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical'],
      description: 'Hiện tượng vận chuyển qua màng, điện sinh học và ứng dụng bức xạ y học.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Điện thế nghỉ & điện thế hoạt động', questionCount: 20, path: 'y-khoa/ly-sinh/de-1' }
      ]
    },
    {
      id: 'tam-ly-dao-duc',
      name: 'Tâm Lý - Đạo Đức Y Học',
      code: 'MED110',
      categoryId: 'co-so-nganh',
      categoryName: 'Cơ sở ngành',
      stages: ['preclinical'],
      description: 'Giao tiếp với bệnh nhân, tâm lý người bệnh và y đức lâm sàng.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Nguyên lý đạo đức y khoa & bí mật bệnh án', questionCount: 20, path: 'y-khoa/tam-ly-dao-duc/de-1' }
      ]
    },

    // 2. Khối Nội Khoa (Lâm Sàng Y4 - Y6 & Sau Đại Học)
    {
      id: 'noi-co-so',
      name: 'Nội Cơ Sở (Triệu Chứng Học)',
      code: 'MED201',
      categoryId: 'noi-khoa',
      categoryName: 'Nội khoa',
      stages: ['preclinical', 'clinical', 'postgraduate'],
      description: 'Kỹ năng hỏi bệnh, khám thực thể các cơ quan và phân tích triệu chứng cơ năng.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Khám tim mạch & nghe tiếng tim', questionCount: 35, path: 'y-khoa/noi-co-so/de-1' },
        { id: 'de-2', name: 'Đề 2 - Khám hô hấp & hội chứng đông đặc', questionCount: 30, path: 'y-khoa/noi-co-so/de-2' }
      ]
    },
    {
      id: 'noi-tim-mach',
      name: 'Nội Tim Mạch',
      code: 'MED202',
      categoryId: 'noi-khoa',
      categoryName: 'Nội khoa',
      stages: ['clinical', 'postgraduate'],
      description: 'Bệnh động mạch vành, suy tim, tăng huyết áp, rối loạn nhịp và bệnh van tim.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Hội chứng mạch vành cấp & ECG', questionCount: 40, path: 'y-khoa/noi-tim-mach/de-1' },
        { id: 'de-2', name: 'Đề 2 - Suy tim phân suất tống máu giảm', questionCount: 35, path: 'y-khoa/noi-tim-mach/de-2' }
      ]
    },
    {
      id: 'noi-ho-hap',
      name: 'Nội Hô Hấp',
      code: 'MED203',
      categoryId: 'noi-khoa',
      categoryName: 'Nội khoa',
      stages: ['clinical', 'postgraduate'],
      description: 'Hen phế quản, COPD, viêm phổi cộng đồng, tràn dịch màng phổi.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Chẩn đoán & bậc điều trị Hen GINA', questionCount: 30, path: 'y-khoa/noi-ho-hap/de-1' }
      ]
    },

    // 3. Khối Ngoại Khoa (Lâm Sàng Y4 - Y6 & Sau Đại Học)
    {
      id: 'ngoai-khoa',
      name: 'Ngoại Khoa Tổng Quát',
      code: 'MED301',
      categoryId: 'ngoai-khoa',
      categoryName: 'Ngoại khoa',
      stages: ['clinical', 'postgraduate'],
      description: 'Cấp cứu bụng ngoại khoa: viêm ruột thừa, tắc ruột, thủng tạng rỗng, sỏi mật.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Cấp cứu viêm ruột thừa & viêm phúc mạc', questionCount: 35, path: 'y-khoa/ngoai-khoa/de-1' }
      ]
    },
    {
      id: 'ngoai-co-xuong',
      name: 'Ngoại Chấn Thương Chỉnh Hình',
      code: 'MED302',
      categoryId: 'ngoai-khoa',
      categoryName: 'Ngoại khoa',
      stages: ['clinical', 'postgraduate'],
      description: 'Gãy xương chi, trật khớp, chấn thương sọ não và hội chứng chèn ép khoang.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Gãy đầu dưới xương quay & gãy thân xương đùi', questionCount: 30, path: 'y-khoa/ngoai-co-xuong/de-1' }
      ]
    },

    // 4. Khối Sản - Nhi Khoa
    {
      id: 'san-1',
      name: 'Sản Khoa 1',
      code: 'MED401',
      categoryId: 'san-khoa',
      categoryName: 'Sản - Nhi',
      stages: ['clinical', 'postgraduate'],
      description: 'Sinh lý chuyển dạ, quản lý thai nghén, tiền sản giật và băng huyết sau sinh.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Các giai đoạn chuyển dạ & theo dõi tim thai', questionCount: 35, path: 'y-khoa/san-1/de-1' }
      ]
    },
    {
      id: 'nhi-khoa',
      name: 'Nhi Khoa Lâm Sàng',
      code: 'MED402',
      categoryId: 'san-khoa',
      categoryName: 'Sản - Nhi',
      stages: ['clinical', 'postgraduate'],
      description: 'Bệnh lý sơ sinh, tiêm chủng, viêm tiểu phế quản, sốt co giật và dinh dưỡng trẻ em.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Sốt co giật lành tính & cấp cứu co giật', questionCount: 30, path: 'y-khoa/nhi-khoa/de-1' }
      ]
    },

    // 5. Khối Chuyên Khoa Lẻ
    {
      id: 'nhap-mon-rang-ham-mat',
      name: 'Răng Hàm Mặt',
      code: 'MED501',
      categoryId: 'chuyen-khoa-le',
      categoryName: 'Chuyên khoa lẻ',
      stages: ['preclinical', 'clinical'],
      description: 'Sâu răng, viêm tủy, chấn thương hàm mặt và nhổ răng tiểu phẫu.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Bệnh sinh sâu răng & giải phẫu cung răng', questionCount: 25, path: 'y-khoa/nhap-mon-rang-ham-mat/de-1' }
      ]
    },
    {
      id: 'chan-doan-hinh-anh',
      name: 'Chẩn Đoán Hình Ảnh',
      code: 'MED502',
      categoryId: 'chuyen-khoa-le',
      categoryName: 'Chuyên khoa lẻ',
      stages: ['clinical', 'postgraduate'],
      description: 'Đọc X-quang ngực thẳng, CT Scanner sọ não và siêu âm bụng tổng quát.',
      decks: [
        { id: 'de-1', name: 'Đề 1 - Phân tích phim X-quang lồng ngực', questionCount: 30, path: 'y-khoa/chan-doan-hinh-anh/de-1' }
      ]
    }
  ],
  books: []
};
