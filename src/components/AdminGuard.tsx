import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';

// Yalnızca ADMIN rolü görür (sunucu da ayrıca yetkiyi kontrol eder).
export default function AdminGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') {
    return <EmptyState icon="lock-closed-outline" title="Bu alan yalnızca yöneticilere açık" />;
  }
  return <>{children}</>;
}
