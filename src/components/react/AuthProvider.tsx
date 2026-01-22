import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  children: ReactNode;
}

export default function AuthProvider({ children }: Props) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe();
  }, [initialize]);

  return <>{children}</>;
}
