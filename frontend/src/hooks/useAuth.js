import { useAuth } from '../context/AuthContext';

export const useAuthHook = () => {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    updateUser,
  } = useAuth();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    updateUser,
  };
};

export default useAuthHook;
