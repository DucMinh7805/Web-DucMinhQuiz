import { useState, useMemo } from 'react';
import { LAB_CATEGORIES as FALLBACK_DATA, transformFallbackData } from '../data/labValuesData';
import { fetchLabValues } from '../services/labValuesApi';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, Info, ChevronLeft, ChevronDown, 
  FlaskConical, HeartPulse, Droplets, Sparkles, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getDirectImageUrl } from '../utils/imageHelper';
import usePageTitle from '../hooks/usePageTitle';

// Lựa chọn icon phù hợp theo chuyên mục xét nghiệm
function getCategoryIcon(categoryId) {
  if (categoryId?.includes('hematology')) return Droplets;
  if (categoryId?.includes('biochemistry')) return FlaskConical;
  if (categoryId?.includes('electrolytes')) return Sparkles;
  if (categoryId?.includes('cardiac')) return HeartPulse;
  return Activity;
}

export default function LabValuesPage() {
  usePageTitle('Trị số xét nghiệm');
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  
  // State hỗ trợ mở CÙNG LÚC NHIỀU chỉ số xét nghiệm
  const [openTests, setOpenTests] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['lab-values-public'],
    queryFn: async () => {
      const res = await fetchLabValues();
      return res.data;
    },
    staleTime: 60_000,
  });

  const topics = useMemo(() => {
    return data?.topics || transformFallbackData(FALLBACK_DATA);
  }, [data]);

  const activeTopic = useMemo(() => {
    if (!selectedTopicId) return null;
    return topics.find(t => t._id === selectedTopicId || t.slug === selectedTopicId);
  }, [selectedTopicId, topics]);

  const toggleTest = (key) => {
    setOpenTests(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const areAllOpen = useMemo(() => {
    if (!activeTopic) return false;
    let allTestIds = [];
    activeTopic.sections?.forEach(sec => {
      sec.tests?.forEach(t => allTestIds.push(t._id));
    });
    return allTestIds.length > 0 && allTestIds.every(id => !!openTests[id]);
  }, [activeTopic, openTests]);

  const toggleAllTests = () => {
    if (!activeTopic) return;
    if (areAllOpen) {
      setOpenTests({});
    } else {
      const next = {};
      activeTopic.sections?.forEach(sec => {
        sec.tests?.forEach(t => {
          next[t._id] = true;
        });
      });
      setOpenTests(next);
    }
  };

  return (
    <div className="w-full min-h-full py-5 px-3.5 sm:px-8 lg:px-10 space-y-6">
      
      {/* 1. Header Trang Trị Số Xét Nghiệm */}
      <div className="bg-white/80 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-3xl p-5 sm:p-7 border border-slate-200/60 dark:border-white/10 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-teal-500/10 via-cyan-500/5 to-transparent rounded-bl-full pointer-events-none" />
        
        <div className="relative z-10 flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl shadow-md shadow-teal-500/20 shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Trị Số Xét Nghiệm Lâm Sàng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Khoảng tham chiếu sinh hóa, huyết học, điện giải và khí máu lâm sàng
            </p>
          </div>
        </div>
      </div>

      {isLoading && topics.length === 0 ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 rounded-full border-4 border-teal-500 border-t-transparent animate-spin"></div>
        </div>
      ) : selectedTopicId && activeTopic ? (
        /* ========================================================================= */
        /* TRƯỜNG HỢP 1: ĐÃ CHỌN 1 KHỐI -> HIỂN THỊ DANH SÁCH TỪNG CHỈ SỐ XÉT NGHIỆM */
        /* ========================================================================= */
        <div className="space-y-4">
          
          {/* Thanh Điều Hướng: Nút Quay Lại + Tên Nhóm + Nút Mở Tất Cả */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedTopicId(null);
                  setOpenTests({});
                }}
                className="flex items-center space-x-1 text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 bg-white/80 dark:bg-[#0c1222]/80 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 transition-colors shrink-0 shadow-2xs"
                title="Trở về danh mục"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden xs:inline">Trở về</span>
              </button>

              {/* Tiêu đề nhóm */}
              <div className="flex items-center space-x-1.5 min-w-0">
                <span className="font-black text-sm sm:text-lg text-slate-900 dark:text-white leading-tight">
                  {activeTopic.name}
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 shrink-0">
                  {activeTopic.sections?.reduce((acc, sec) => acc + (sec.tests?.length || 0), 0) || 0} chỉ số
                </span>
              </div>
            </div>

            {/* Nút Mở Tất Cả / Thu Gọn Tất Cả */}
            <button
              type="button"
              onClick={toggleAllTests}
              className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 bg-teal-500/10 px-3 py-1.5 rounded-xl border border-teal-500/20 transition-all shrink-0"
            >
              {areAllOpen ? 'Thu gọn' : 'Mở tất cả'}
            </button>
          </div>

          {/* Danh sách Section -> Tests */}
          <div className="space-y-6">
            {activeTopic.sections?.map((section) => (
              <div key={section._id} className="space-y-3">
                {activeTopic.sections.length > 1 && (
                  <h3 className="font-bold text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wider ml-2">
                    {section.name}
                  </h3>
                )}

                {section.tests?.map((test) => {
                  const testKey = test._id;
                  const isOpen = !!openTests[testKey];

                  return (
                    <div
                      key={testKey}
                      className={`rounded-2xl border transition-all overflow-hidden ${
                        isOpen
                          ? 'bg-white dark:bg-[#0c1222] border-teal-500/50 shadow-md ring-1 ring-teal-500/20'
                          : 'bg-white/80 dark:bg-[#0c1222]/80 hover:bg-white dark:hover:bg-[#0c1222] border-slate-200/80 dark:border-white/10 shadow-2xs'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleTest(testKey)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 select-none"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOpen ? 'bg-teal-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`} />
                          <div className="flex flex-col">
                            <h3 className="font-black text-sm sm:text-base text-slate-800 dark:text-white truncate">
                              {test.name}
                            </h3>
                            {test.shortName && (
                              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {test.shortName}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          {test.unit && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hidden xs:inline">
                              {test.unit}
                            </span>
                          )}
                          <div className={`p-1 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-teal-600' : ''}`}>
                            <ChevronDown className="w-4 h-4" />
                          </div>
                        </div>
                      </button>

                      {/* Chi Tiết Mở Rộng */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-white/5 space-y-3"
                          >
                            {test.interpretations?.map((interp, iIdx) => {
                              if (interp.type === 'reference') {
                                return (
                                  <div key={iIdx} className="p-3.5 sm:p-4 rounded-2xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/20 space-y-1.5">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                      {interp.label || 'Khoảng tham chiếu:'}
                                    </span>
                                    <div className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-relaxed whitespace-pre-line">
                                      {interp.referenceText}
                                      {interp.unit && (
                                        <span className="ml-2 font-bold text-xs sm:text-sm text-teal-700 dark:text-teal-300">
                                          ({interp.unit})
                                        </span>
                                      )}
                                    </div>
                                    {interp.condition && (
                                      <div className="text-xs text-teal-600 dark:text-teal-500 mt-1">
                                        Lưu ý: {interp.condition}
                                      </div>
                                    )}
                                  </div>
                                );
                              } else {
                                return (
                                  <div key={iIdx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 flex items-start space-x-2.5">
                                    <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 mr-1 shrink-0 mt-0.5" />
                                    <div className="space-y-1 flex-1">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                                        {interp.label || 'Ý nghĩa lâm sàng:'}
                                      </span>
                                      <p className="leading-relaxed text-slate-700 dark:text-slate-200 font-medium whitespace-pre-line">
                                        {interp.meaning}
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* TRƯỜNG HỢP 2: GIAO DIỆN CHÍNH -> HIỂN THỊ KHỐI CÁC NHÓM XÉT NGHIỆM       */
        /* ========================================================================= */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
          {topics.map((topic, index) => {
            const IconComp = getCategoryIcon(topic.slug);
            const hasCustomImage = !!topic.image;
            const totalTests = topic.sections?.reduce((acc, sec) => acc + (sec.tests?.length || 0), 0) || 0;

            return (
              <motion.div
                key={topic._id}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                onClick={() => {
                  setSelectedTopicId(topic._id);
                  setOpenTests({});
                }}
                className="group bg-white/90 dark:bg-[#0c1222]/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-200/70 dark:border-white/10 hover:border-teal-500/50 dark:hover:border-teal-400/50 shadow-2xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col cursor-pointer select-none"
              >
                {/* Khung Bìa Khối */}
                <div className="h-28 sm:h-36 w-full relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex items-center justify-center p-3">
                  {hasCustomImage ? (
                    <img 
                      src={getDirectImageUrl(topic.image)}
                      alt={topic.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 dark:bg-white/5 border border-white/10 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                      <IconComp className="w-7 h-7 sm:w-8 sm:h-8" />
                    </div>
                  )}

                  {/* Huy hiệu số lượng */}
                  <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-black bg-black/60 backdrop-blur-md text-teal-300 border border-white/10 shadow-xs">
                    {totalTests} chỉ số
                  </span>
                </div>

                {/* Phần Tiêu Đề Khối */}
                <div className="p-3.5 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors line-clamp-2 min-h-[2.5rem] leading-snug">
                      {topic.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 line-clamp-2 leading-snug">
                      {topic.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs font-bold text-teal-600 dark:text-teal-400">
                    <span>Xem danh sách</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer Disclaimer */}
      <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>Trị số tham khảo có thể thay đổi theo phòng xét nghiệm, phương pháp đo và đối tượng bệnh nhân.</p>
      </div>

    </div>
  );
}
