import { useState } from 'react';
import { ChevronLeft, Search, LayoutGrid, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';

import { getDirectImageUrl } from '../utils/imageHelper';
import { useOutletContext } from 'react-router-dom';

export default function CategoryPage() {
  const manifest = useOutletContext();
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  // Lấy các môn học thuộc Khoa hiện tại
  const categorySubjects = manifest?.subjects.filter(s => s.categoryId === categoryId) || [];
  
  // Tên Khoa hiện tại (Lấy từ môn học đầu tiên)
  const categoryName = categorySubjects.length > 0 ? categorySubjects[0].categoryName : "Chuyên Khoa";

  const filteredSubjects = categorySubjects.filter(sub => 
    sub.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-full py-6 px-4 sm:px-8 lg:px-12 w-full space-y-6">
      {/* Tiêu đề Khoa */}
      <div className="bg-white/80 dark:bg-navy-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-10 border border-slate-200/60 dark:border-navy-700 shadow-sm relative overflow-hidden text-center">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-500/10 via-primary-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col items-center">
          <button 
            onClick={() => navigate('/')} 
            className="group flex items-center text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-primary mb-6 transition-colors w-fit bg-slate-50 dark:bg-navy-700 px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-navy-600"
          >
            <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
            Trở về Bản đồ lâm sàng
          </button>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2 flex items-center justify-center">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-500">
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
              className="block w-full pl-11 pr-4 py-3 bg-white dark:bg-navy-900 border border-slate-200/90 dark:border-navy-700 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-800 dark:text-white placeholder-slate-400 outline-none shadow-sm text-xs sm:text-sm font-medium"
              placeholder={`Tìm kiếm môn học trong ${categoryName}...`}
            />
          </div>
        </div>
      </div>

      {/* Danh sách môn học */}
      <div className="w-full max-w-7xl mx-auto mt-6">
        {filteredSubjects.length > 0 ? (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            <AnimatePresence>
              {filteredSubjects.map((subject, index) => (
                <motion.button
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  key={subject.id}
                  onClick={() => navigate(`/subject/${subject.id}`)}
                  className="group text-left bg-white dark:bg-navy-800 p-6 rounded-3xl shadow-sm border border-slate-200/80 dark:border-navy-700 hover:shadow-lg hover:border-primary-400 dark:hover:border-primary-500 hover:-translate-y-1 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
                >
                  <div className="mb-6 bg-primary-50 dark:bg-primary-950/40 h-14 w-14 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner border border-primary-100 dark:border-primary-900/40">
                    {subject.icon ? (
                      <img 
                        src={getDirectImageUrl(subject.icon)} 
                        alt={subject.name} 
                        loading="lazy"
                        className="h-full w-full object-cover" 
                        onError={(e) => { 
                          e.currentTarget.style.display = 'none'; 
                          if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'block'; 
                        }} 
                      />
                    ) : null}
                    <BookOpen className={`h-6 w-6 text-primary ${subject.icon ? 'hidden' : 'block'}`} />
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary transition-colors mb-2">
                    {subject.name}
                  </h3>
                  
                  {subject.description && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-5 flex-grow font-normal">
                      {subject.description}
                    </p>
                  )}
                  
                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-navy-700 w-full flex items-center justify-between text-xs sm:text-sm font-semibold">
                    <span className="text-slate-400 dark:text-slate-500">
                      {subject.decks?.length || 0} bộ đề
                    </span>
                    <span className="text-primary font-bold group-hover:underline">
                      Xem chi tiết &rarr;
                    </span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center opacity-60 mt-10">
            <LayoutGrid className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">Không tìm thấy môn học nào phù hợp.</p>
          </div>
        )}
      </div>
    </div>
  );
}
