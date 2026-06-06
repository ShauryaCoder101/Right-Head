import { useAuthStore } from '../store/authStore';

export function useAuth() {
  const { user, isAuthenticated, login, logout, register, isLoading, error } = useAuthStore();
  return { user, isAuthenticated, login, logout, register, isLoading, error };
}
