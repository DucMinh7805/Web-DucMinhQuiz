import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminGuard({ children }) {
  const { user, loading, refreshAccess } = useAuth();
  const location = useLocation();
  const [roleChecked, setRoleChecked] = useState(false);
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    if (loading || !user || user.role === 'admin' || roleChecked || checkingRole) return;

    setCheckingRole(true);
    refreshAccess()
      .catch(() => null)
      .finally(() => {
        setRoleChecked(true);
        setCheckingRole(false);
      });
  }, [checkingRole, loading, refreshAccess, roleChecked, user]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'admin' && (!roleChecked || checkingRole)) return null;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
