/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

function mergeVerifiedUser(previousUser, userData) {
  const sameAccount = previousUser?.phone === userData?.phone ? previousUser : null;
  const entitlements = Array.isArray(userData?.entitlements) ? userData.entitlements : [];
  const entitlementKeys = entitlements.map(item => item.itemKey).filter(Boolean);
  const entitlementExpirations = Object.fromEntries(
    entitlements.filter(item => item?.itemKey && item?.expiresAt).map(item => [item.itemKey, item.expiresAt])
  );
  return {
    ...(sameAccount || {}),
    ...userData,
    entitlementKeys,
    // Hai trường dưới chỉ phục vụ hiển thị tương thích ở trang hồ sơ.
    // API vẫn xác minh lại entitlement trong cookie HttpOnly cho mọi nội dung PRO.
    unlockedSubjects: entitlementKeys.filter(key => key.startsWith('subject:')).map(key => key.slice(8)),
    unlockedBooks: entitlementKeys.filter(key => key.startsWith('book:')).map(key => key.slice(5)),
    subjectExpirations: entitlementExpirations,
    loginTime: new Date().toISOString()
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // localStorage chỉ giữ tiến độ/UI. Danh tính và quyền luôn lấy lại từ cookie
    // HttpOnly do máy chủ ký; sửa localStorage không thể mở API PRO.
    let cachedProfile = null;
    try {
      cachedProfile = JSON.parse(localStorage.getItem('y_khoa_user') || 'null');
    } catch {
      localStorage.removeItem('y_khoa_user');
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async response => response.ok ? response.json() : null)
      .then(data => {
        if (!data?.user) return setUser(null);
        const verifiedUser = mergeVerifiedUser(cachedProfile, { ...data.user, isAuthenticated: true });
        localStorage.setItem('y_khoa_user', JSON.stringify(verifiedUser));
        setUser(verifiedUser);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = (userData) => {
    const newUser = mergeVerifiedUser(user, userData);
    localStorage.setItem('y_khoa_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const updateProfile = (profileChanges) => {
    if (!user || !profileChanges || typeof profileChanges !== 'object') return false;
    const updatedUser = { ...user, ...profileChanges };
    localStorage.setItem('y_khoa_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    return true;
  };

  const logout = () => {
    fetch('/api/auth/sheet-logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    localStorage.removeItem('y_khoa_user');
    setUser(null);
  };

  const updateProgress = (
    subjectId,
    deckId,
    score,
    total,
    wrongQuestions = [],
    timeSpentSeconds = 0,
    answeredQuestionIds = []
  ) => {
    if (!user) return;
    
    const updatedUser = { ...user };
    if (!updatedUser.progress) updatedUser.progress = {};
    if (!updatedUser.progress[subjectId]) updatedUser.progress[subjectId] = {};
    
    updatedUser.progress[subjectId][deckId] = {
      score,
      total,
      timeSpentSeconds: timeSpentSeconds || 0,
      date: new Date().toISOString(),
      completedAt: new Date().toISOString()
    };

    // Lưu vào Sổ tay câu sai (Mistakes Notebook)
    if (!updatedUser.mistakes) updatedUser.mistakes = [];
    
    const wrongIds = new Set((wrongQuestions || []).map(wq => String(wq.id || wq.questionId)).filter(Boolean));
    const answeredIds = new Set((answeredQuestionIds || []).map(String));

    // Câu đã làm đúng trong lượt này phải được gỡ khỏi sổ tay. Chỉ tác động
    // các ID thực sự xuất hiện trong lượt làm bài để không xóa nhầm dữ liệu khác.
    updatedUser.mistakes = updatedUser.mistakes.filter(mistake => {
      const mistakeId = String(mistake.id || mistake.questionId || '');
      return !answeredIds.has(mistakeId) || wrongIds.has(mistakeId);
    });

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

  // Chỉ áp dụng entitlement sau khi mã đã được Google Apps Script xác thực.
  const applyVerifiedEntitlement = (verifiedUser) => {
    if (!verifiedUser?.phone) return false;
    login({ ...user, ...verifiedUser, isAuthenticated: true });
    return true;
  };

  const updateAccountProfile = async (profileChanges) => {
    if (!user || !profileChanges || typeof profileChanges !== 'object') {
      throw new Error('Bạn cần đăng nhập lại để cập nhật hồ sơ.');
    }
    const response = await fetch('/api/auth/update-profile', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileChanges)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success || !data?.user) {
      throw new Error(data?.message || 'Không thể cập nhật hồ sơ.');
    }

    // Giữ tiến độ/avatar cục bộ khi người dùng đổi SĐT; danh tính và quyền
    // được thay bằng dữ liệu đã xác minh từ máy chủ/Google Sheet.
    const verifiedUser = mergeVerifiedUser(
      { ...user, phone: data.user.phone },
      { ...data.user, isAuthenticated: true }
    );
    localStorage.setItem('y_khoa_user', JSON.stringify(verifiedUser));
    setUser(verifiedUser);
    return verifiedUser;
  };

  const refreshAccess = async () => {
    const response = await fetch('/api/auth/refresh-access', {
      method: 'POST',
      credentials: 'include'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.success || !data?.user) {
      throw new Error(data?.message || 'Không thể kiểm tra quyền vừa cấp.');
    }
    login({ ...data.user, isAuthenticated: true });
    return data.user;
  };

  // Kiểm tra môn học đã được mở khóa hay chưa
  const isSubjectUnlocked = (itemId, price, itemType = 'subject') => {
    // Nếu môn miễn phí (price = 0 hoặc không có) -> Luôn mở khóa
    if (!price || price === 0 || price === '0' || price === 'Miễn phí') return true;
    if (!user) return false;
    if (user.role === 'admin') return true;
    const itemKey = `${itemType}:${itemId}`;
    const expiry = user.subjectExpirations?.[itemKey];
    return Boolean(user.entitlementKeys?.includes(itemKey) && expiry && new Date(expiry).getTime() > Date.now());
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      updateProfile,
      updateAccountProfile,
      updateProgress,
      removeMistake,
      clearMistakes,
      reviewMistake,
      applyVerifiedEntitlement,
      refreshAccess,
      isSubjectUnlocked
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
