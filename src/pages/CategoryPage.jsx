import { useState } from 'react';
import { ChevronLeft, Search, LayoutGrid, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';

import { getDirectImageUrl } from '../utils/imageHelper';
import { useOutletContext } from 'react-router-dom';
import SubjectCardGrid from '../components/Graph/SubjectCardGrid';

import { FOUR_PILLARS_CONFIG } from '../components/Home/HomeFourPillars';

export default function CategoryPage() {
  const manifest = useOutletContext();
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Kiểm tra xem có khớp với 1 trong 4 Khối Trụ Cột không
  const matchedPillar = FOUR_PILLARS_CONFIG.find(p => p.id === categoryId);

  // 2. Lấy danh sách môn học theo Trụ Cột hoặc theo CategoryId
  const categorySubjects = matchedPillar
    ? (manifest?.subjects?.filter(matchedPillar.match) || [])
    : (manifest?.subjects?.filter(s => s.categoryId === categoryId) || []);
  
  // Tên Khoa hiện tại
  const categoryName = matchedPillar
    ? matchedPillar.name
    : (categorySubjects.length > 0 ? categorySubjects[0].categoryName : "Chuyên Khoa");

  const filteredSubjects = categorySubjects.filter(sub => 
    sub.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full py-6 px-4 sm:px-8 lg:px-12 w-full space-y-6">
      {/* Tiêu đề Khoa */}
      <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center">
          <button 
            onClick={() => navigate('/')} 
            className="group flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 mb-6 transition-colors w-fit bg-slate-100 dark:bg-white/5 px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10"
          >
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Trở về Trang chủ
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2 flex items-center justify-center">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-500">
                {categoryName}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Tìm thấy {categorySubjects.length} môn học trong chuyên khoa này.
            </p>
          </motion.div>

          <div className="relative max-w-xl w-full mx-auto mt-6">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-slate-800 dark:text-white placeholder-slate-400 outline-none shadow-sm text-xs sm:text-sm font-medium"
              placeholder={`Tìm kiếm môn học trong ${categoryName}...`}
            />
          </div>
        </div>
      </div>

      {/* Danh sách môn học */}
      <div className="w-full max-w-7xl mx-auto mt-6">
        <SubjectCardGrid subjects={filteredSubjects} />
      </div>
    </div>
  );
}
