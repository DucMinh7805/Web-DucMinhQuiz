/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy thông tin user từ localStorage khi ứng dụng khởi chạy
    const storedUser = localStorage.getItem('y_khoa_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    // Lưu user vào localStorage để giữ đăng nhập
    const newUser = {
      ...userData,
      loginTime: new Date().toISOString()
    };
    localStorage.setItem('y_khoa_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('y_khoa_user');
    setUser(null);
  };

  const updateProgress = (subjectId, deckId, score, total, wrongQuestions = []) => {
    if (!user) return;
    
    const updatedUser = { ...user };
    if (!updatedUser.progress) updatedUser.progress = {};
    if (!updatedUser.progress[subjectId]) updatedUser.progress[subjectId] = {};
    
    updatedUser.progress[subjectId][deckId] = {
      score,
      total,
      date: new Date().toISOString()
    };

    // Lưu vào Sổ tay câu sai (Mistakes Notebook)
    if (!updatedUser.mistakes) updatedUser.mistakes = [];
    
    // Loại bỏ các câu đã trả lời đúng lần này ra khỏi sổ tay câu sai (nếu có)
    // Và thêm các câu sai mới vào
    if (wrongQuestions && wrongQuestions.length > 0) {
      wrongQuestions.forEach(wq => {
        const qId = wq.id || wq.questionId;
        const existingIdx = updatedUser.mistakes.findIndex(m => (m.id || m.questionId) === qId);
        if (existingIdx >= 0) {
          updatedUser.mistakes[existingIdx] = { ...wq, id: qId, date: new Date().toISOString() };
        } else {
          updatedUser.mistakes.push({ ...wq, id: qId, subjectId, deckId, date: new Date().toISOString() });
        }
      });
    }

    localStorage.setItem('y_khoa_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const removeMistake = (questionId) => {
    if (!user || !user.mistakes) return;
    const updatedUser = {
      ...user,
      mistakes: user.mistakes.filter(m => (m.id || m.questionId) !== questionId)
    };
    localStorage.setItem('y_khoa_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const clearMistakes = (subjectId = null) => {
    if (!user) return;
    const updatedUser = { ...user };
    if (subjectId) {
      updatedUser.mistakes = (updatedUser.mistakes || []).filter(m => m.subjectId !== subjectId);
    } else {
      updatedUser.mistakes = [];
    }
    localStorage.setItem('y_khoa_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Thuật toán Spaced Repetition (SM-2)
  const reviewMistake = (questionId, quality) => {
    if (!user || !user.mistakes) return;
    const updatedUser = { ...user };
    
    const mistakeIdx = updatedUser.mistakes.findIndex(m => (m.id || m.questionId) === questionId);
    if (mistakeIdx < 0) return;

    const mistake = updatedUser.mistakes[mistakeIdx];
    
    // Khởi tạo các giá trị SM-2 nếu chưa có
    let ease = mistake.ease || 2.5;
    let repetitions = mistake.repetitions || 0;
    let interval = mistake.interval || 0;

    if (quality >= 3) {
      // Trả lời đúng (quality = 3, 4, 5)
      if (repetitions === 0) {
        interval = 1;
      } else if (repetitions === 1) {
        interval = 6;
      } else {
        interval = Math.round(interval * ease);
      }
      repetitions += 1;
    } else {
      // Trả lời sai (quality = 0, 1, 2)
      repetitions = 0;
      interval = 1;
    }

    // Tính lại hệ số dễ (Ease Factor)
    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (ease < 1.3) ease = 1.3;

    // Tính ngày ôn tập tiếp theo
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);

    updatedUser.mistakes[mistakeIdx] = {
      ...mistake,
      ease,
      repetitions,
      interval,
      lastReviewDate: new Date().toISOString(),
      nextReviewDate: nextDate.toISOString()
    };

    localStorage.setItem('y_khoa_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      updateProgress,
      removeMistake,
      clearMistakes,
      reviewMistake
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
