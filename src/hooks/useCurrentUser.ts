import { useCallback, useEffect, useState } from 'react';
import { getUserInfo, isLoggedIn } from '../api/user/loginApi';
import { getUserById, BasicUserDTO } from '../api/user/userApi';

export interface CurrentUserInfo {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
  enabled?: boolean;
}

interface UseCurrentUserResult {
  user: CurrentUserInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const buildUserFromSources = (
  tokenUser: ReturnType<typeof getUserInfo>,
  apiUser?: BasicUserDTO | null,
): CurrentUserInfo => ({
  id: tokenUser?.id ?? '',
  username: apiUser?.username ?? tokenUser?.username,
  firstName: apiUser?.firstName,
  lastName: apiUser?.lastName ?? tokenUser?.lastName,
  avatar: apiUser?.avatar ?? tokenUser?.avatar,
  role: tokenUser?.role,
  enabled: tokenUser?.enabled,
});

export const useCurrentUser = (): UseCurrentUserResult => {
  const [user, setUser] = useState<CurrentUserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!isLoggedIn()) {
        setUser(null);
        return;
      }

      const tokenUser = getUserInfo();
      if (!tokenUser?.id) {
        setUser(null);
        return;
      }

      const fallback = buildUserFromSources(tokenUser);

      try {
        const apiUser = await getUserById(tokenUser.id);
        setUser(buildUserFromSources(tokenUser, apiUser));
      } catch (fetchError) {
        console.error('Unable to fetch user profile from API:', fetchError);
        setUser(fallback);
        setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải thông tin người dùng');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleStorage = () => {
      refresh();
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [refresh]);

  return { user, loading, error, refresh };
};

export default useCurrentUser;
