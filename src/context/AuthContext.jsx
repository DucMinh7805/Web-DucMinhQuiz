/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { mergeMistakes, mergeProgress, normalizeMistakes } from '../../shared/userDataMerge.js';

export { mergeMistakes, mergeProgress } from '../../shared/userDataMerge.js';

const AuthContext = createContext();

function getUserData(phone) {
  if (!phone) return { progress: {}, mistakes: [] };
  try {
    const progress = JSON.parse(localStorage.getItem(`y_khoa_progress_${phone}`) || '{}');
    const mistakes = JSON.parse(localStorage.getItem(`y_khoa_mistakes_${phone}`) || '[]');
    return { progress: mergeProgress({}, progress), mistakes: normalizeMistakes(mistakes) };
  } catch {
    return { progress: {}, mistakes: [] };
  }
}

function saveUserData(phone, progress, mistakes) {
  if (!phone) return;
  try {
    if (progress !== undefined && progress !== null) {
      localStorage.setItem(`y_khoa_progress_${phone}`, JSON.stringify(progress));
    }
    if (mistakes !== undefined && mistakes !== null) {
      localStorage.setItem(`y_khoa_mistakes_${phone}`, JSON.stringify(mistakes));
    }
  } catch (e) {
    console.warn('[Save User Data]', e);
  }
}

function mergeVerifiedUser(previousUser, userData) {
  const phone = userData?.phone || previousUser?.phone;
  const sameAccount = previousUser?.phone === userData?.phone ? previousUser : null;
  const entitlements = Array.isArray(userData?.entitlements) ? userData.entitlements : [];
  const entitlementKeys = entitlements.map(item => item.itemKey).filter(Boolean);
  const entitlementExpirations = Object.fromEntries(
    entitlements.filter(item => item?.itemKey && item?.expiresAt).map(item => [item.itemKey, item.expiresAt])
  );

  // Nạp tiến độ và sổ tay câu sai độc lập theo đúng ID/SĐT tài khoản
  const isolatedData = getUserData(phone);
  const progress = (sameAccount && sameAccount.progress && Object.keys(sameAccount.progress).length > 0)
    ? sameAccount.progress
    : (isolatedData.progress || userData?.progress || {});
  const mistakes = (sameAccount && sameAccount.mistakes && sameAccount.mistakes.length > 0)
    ? sameAccount.mistakes
    : (isolatedData.mistakes || userData?.mistakes || []);

  return {
    ...(sameAccount || {}),
    ...userData,
    progress,
    mistakes,
    entitlementKeys,
    // Hai trường dưới chỉ phục vụ hiển thị tương thích ở trang hồ sơ.
    // API vẫn xác minh lại entitlement trong cookie HttpOnly cho mọi nội dung PRO.
    unlockedSubjects: entitlementKeys.filter(key => key.startsWith('subject:')).map(key => key.slice(8)),
    unlockedBooks: entitlementKeys.filter(key => key.startsWith('book:')).map(key => key.slice(5)),
    subjectExpirations: entitlementExpirations,
    loginTime: new Date().toISOString()
  };
}

let syncTimer = null;
export function syncUserDataToCloud(progress, mistakes, { replaceMistakes = false } = {}) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    fetch('/api/user/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ progress, mistakes, replaceMistakes })
    }).catch(err => console.warn('[Cloud Sync Failed]', err));
  }, 1000);
}

function removeUserData(phone) {
  if (!phone) return;
  try {
    localStorage.removeItem(`y_khoa_progress_${phone}`);
    localStorage.removeItem(`y_khoa_mistakes_${phone}`);
  } catch (error) {
    console.warn('[Remove User Data]', error);
  }
}

function saveCachedUser(user) {
  try {
    localStorage.setItem('y_khoa_user', JSON.stringify(user));
  } catch (error) {
    console.warn('[Save Cached User]', error);
  }
}

function removeCachedUser() {
  try {
    localStorage.removeItem('y_khoa_user');
  } catch (error) {
    console.warn('[Remove Cached User]', error);
  }
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
      removeCachedUser();
    }
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async response => response.ok ? response.json() : null)
      .then(async data => {
        if (!data?.user) return setUser(null);
        let verifiedUser = mergeVerifiedUser(cachedProfile, { ...data.user, isAuthenticated: true });

        // Tự động đồng bộ tiến độ đám mây giữa các thiết bị (Mobile <-> PC)
        try {
          const progRes = await fetch('/api/user/progress', { credentials: 'include' });
          if (progRes.ok) {
            const progData = await progRes.json();
            if (progData.success) {
              const mergedP = mergeProgress(progData.progress, verifiedUser.progress);
              const mergedM = mergeMistakes(progData.mistakes, verifiedUser.mistakes);

              verifiedUser = {
                ...verifiedUser,
                progress: mergedP,
                mistakes: mergedM
              };
              saveUserData(verifiedUser.phone, mergedP, mergedM);

              // Nếu local có dữ liệu chưa được nạp lên server thì gửi lên để đồng bộ
              const serverDeckCount = Object.keys(progData.progress || {}).length;
              const localDeckCount = Object.keys(mergedP || {}).length;
              if (localDeckCount > serverDeckCount || (progData.mistakes || []).length < mergedM.length) {
                syncUserDataToCloud(mergedP, mergedM);
              }
            }
          }
        } catch (e) {
          console.warn('[Fetch Cloud Progress Failed]', e);
        }

        saveCachedUser(verifiedUser);
        setUser(verifiedUser);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = (userData) => {
    const newUser = mergeVerifiedUser(user, userData);
    saveCachedUser(newUser);
    setUser(newUser);

    // Đồng bộ từ đám mây ngay khi đăng nhập
    fetch('/api/user/progress', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(progData => {
        if (progData?.success) {
          const mergedP = mergeProgress(progData.progress, newUser.progress);
          const mergedM = mergeMistakes(progData.mistakes, newUser.mistakes);
          const syncedUser = { ...newUser, progress: mergedP, mistakes: mergedM };
          saveUserData(syncedUser.phone, mergedP, mergedM);
          saveCachedUser(syncedUser);
          setUser(syncedUser);
          syncUserDataToCloud(mergedP, mergedM);
        }
      })
      .catch(() => {});
  };

  const updateProfile = (profileChanges) => {
    if (!user || !profileChanges || typeof profileChanges !== 'object') return false;
    const updatedUser = { ...user, ...profileChanges };
    saveCachedUser(updatedUser);
    setUser(updatedUser);
    return true;
  };

  const logout = () => {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    fetch('/api/auth/me', { method: 'DELETE', credentials: 'include' }).catch(() => {});
    removeCachedUser();
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
    
    const updatedProgress = {
      ...(user.progress || {}),
      [subjectId]: {
        ...(user.progress?.[subjectId] || {}),
        [deckId]: {
          score,
          total,
          timeSpentSeconds: timeSpentSeconds || 0,
          date: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }
      }
    };

    // Lưu vào Sổ tay câu sai (Mistakes Notebook)
    let updatedMistakes = [...(Array.isArray(user.mistakes) ? user.mistakes : [])];
    
    const wrongIds = new Set((wrongQuestions || []).map(wq => String(wq.id || wq.questionId)).filter(Boolean));
    const answeredIds = new Set((answeredQuestionIds || []).map(String));

    // Câu đã làm đúng trong lượt này phải được gỡ khỏi sổ tay. Chỉ tác động
    // các ID thực sự xuất hiện trong lượt làm bài để không xóa nhầm dữ liệu khác.
    updatedMistakes = updatedMistakes.filter(mistake => {
      const mistakeId = String(mistake.id || mistake.questionId || '');
      return !answeredIds.has(mistakeId) || wrongIds.has(mistakeId);
    });

    if (wrongQuestions && wrongQuestions.length > 0) {
      wrongQuestions.forEach(wq => {
        const qId = wq.id || wq.questionId;
        const existingIdx = updatedMistakes.findIndex(m => String(m.id || m.questionId || '') === String(qId || ''));
        if (existingIdx >= 0) {
          updatedMistakes[existingIdx] = { ...wq, id: qId, date: new Date().toISOString() };
        } else {
          updatedMistakes.push({ ...wq, id: qId, subjectId, deckId, date: new Date().toISOString() });
        }
      });
    }

    const updatedUser = { ...user, progress: updatedProgress, mistakes: updatedMistakes };

    saveCachedUser(updatedUser);
    saveUserData(user.phone, updatedUser.progress, updatedUser.mistakes);
    setUser(updatedUser);
    syncUserDataToCloud(updatedUser.progress, updatedUser.mistakes, { replaceMistakes: true });
  };

  const removeMistake = (questionId) => {
    if (!user || !user.mistakes) return;
    const updatedUser = {
      ...user,
      mistakes: user.mistakes.filter(m => String(m.id || m.questionId || '') !== String(questionId || ''))
    };
    saveCachedUser(updatedUser);
    saveUserData(user.phone, null, updatedUser.mistakes);
    setUser(updatedUser);
    syncUserDataToCloud(updatedUser.progress, updatedUser.mistakes, { replaceMistakes: true });
  };

  const clearMistakes = (subjectId = null) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      mistakes: subjectId
        ? (user.mistakes || []).filter(m => String(m.subjectId || '') !== String(subjectId))
        : []
    };
    saveCachedUser(updatedUser);
    saveUserData(user.phone, null, updatedUser.mistakes);
    setUser(updatedUser);
    syncUserDataToCloud(updatedUser.progress, updatedUser.mistakes, { replaceMistakes: true });
  };

  // Thuật toán Spaced Repetition (SM-2)
  const reviewMistake = (questionId, quality) => {
    if (!user || !user.mistakes) return;
    const updatedMistakes = [...user.mistakes];
    const mistakeIdx = updatedMistakes.findIndex(m => String(m.id || m.questionId || '') === String(questionId || ''));
    if (mistakeIdx < 0) return;

    const mistake = updatedMistakes[mistakeIdx];
    
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

    updatedMistakes[mistakeIdx] = {
      ...mistake,
      ease,
      repetitions,
      interval,
      lastReviewDate: new Date().toISOString(),
      nextReviewDate: nextDate.toISOString()
    };

    const updatedUser = { ...user, mistakes: updatedMistakes };

    saveCachedUser(updatedUser);
    saveUserData(user.phone, null, updatedUser.mistakes);
    setUser(updatedUser);
    syncUserDataToCloud(updatedUser.progress, updatedUser.mistakes);
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
    saveUserData(verifiedUser.phone, verifiedUser.progress, verifiedUser.mistakes);
    if (user.phone !== verifiedUser.phone) removeUserData(user.phone);
    saveCachedUser(verifiedUser);
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
      isSubjectUnlocked,
      syncToCloud: () => syncUserDataToCloud(user?.progress, user?.mistakes)
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
