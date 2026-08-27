export default function HomeBackdrop() {
  return (
    <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
      {/* 1. Lưới Cyber Medical Dots toàn trang */}
      <div className="absolute inset-0 bg-[radial-gradient(#0d9488_1.8px,transparent_1.8px)] [background-size:24px_24px] opacity-35 dark:opacity-25" />

      {/* 2. Dải màu Gradient Xanh Ngọc Biển ở đỉnh trang */}
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-teal-500/25 via-cyan-400/15 to-transparent dark:from-teal-950/85 dark:via-cyan-950/45 dark:to-transparent" />

      {/* 3. Các vầng sáng Ambient Glow trải dài khắp trang */}
      {/* Top Hero Glows */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[850px] h-[450px] bg-gradient-to-b from-teal-400/40 via-cyan-300/25 to-transparent rounded-full blur-[100px]" />
      <div className="absolute top-10 left-6 w-[450px] h-[400px] bg-emerald-400/25 rounded-full blur-[90px]" />
      <div className="absolute top-10 right-6 w-[450px] h-[400px] bg-cyan-500/25 rounded-full blur-[90px]" />

      {/* Middle (Khối Môn học & Chuyên khoa) Glows */}
      <div className="absolute top-[45%] left-1/4 w-[600px] h-[450px] bg-teal-500/15 dark:bg-teal-500/20 rounded-full blur-[130px]" />
      <div className="absolute top-[55%] right-10 w-[550px] h-[450px] bg-cyan-500/15 dark:bg-cyan-500/20 rounded-full blur-[130px]" />

      {/* Bottom (Cổng tiện ích) Glow */}
      <div className="absolute bottom-10 left-1/3 w-[550px] h-[400px] bg-emerald-500/15 dark:bg-emerald-500/20 rounded-full blur-[120px]" />
    </div>
  );
}
