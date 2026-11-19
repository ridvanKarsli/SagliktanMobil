import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useBadges } from '@/utils/useBadges';

type BadgeValue = ReturnType<typeof useBadges>;
const BadgeContext = createContext<BadgeValue>({ notifications: 0, messages: 0, requests: 0, refresh: async () => {} });

export function BadgeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const value = useBadges(isAuthenticated);
  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadgeCounts(): BadgeValue {
  return useContext(BadgeContext);
}
