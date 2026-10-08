import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';
import { useApplicationContext } from '@commercetools-frontend/application-shell-connectors';
import {
  useSharedJwtTokenFetcher,
  useSharedJwtTokenSetter,
} from '../hooks/use-shared-custom-object-storage';

export interface RefreshJwtResponse {
  token: string;
}

interface AuthContextValue {
  jwtToken: string | null;
  isAuthenticated: boolean;
  isExpired: boolean;
  isRefreshing: boolean;
  setJwtToken: (token: string | null) => Promise<void>;
  clearAuth: () => void;
  refreshJwt: () => Promise<RefreshJwtResponse>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const getBaseUrl = (url: string) => url.replace(/\/$/, '');

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [jwtToken, setJwtTokenState] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { environment } = useApplicationContext<{ CMS_API_URL: string }>();
  const baseUrl = getBaseUrl(environment.CMS_API_URL ?? '');

  const isExpired = useMemo(() => {
    if (!jwtToken) {
      return true;
    }
    try {
      const tokenParts = jwtToken.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      const expirationTime = payload.exp * 1000;
      const currentTime = Date.now();
      return currentTime >= expirationTime;
    } catch {
      return true;
    }
  }, [jwtToken]);

  const { jwtToken: fetchedToken, loading: fetchLoading } =
    useSharedJwtTokenFetcher();
  const { setJwtToken: storeJwtToken, loading: setLoading } =
    useSharedJwtTokenSetter();

  const refreshJwt = useCallback(async (): Promise<RefreshJwtResponse> => {
    try {
      setIsRefreshing(true);
      const response = await fetch(`${baseUrl}/refresh-jwt`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message ||
            'Failed to refresh JWT token'
        );
      }

      const data = (await response.json()) as RefreshJwtResponse;
      await storeJwtToken(data.token);
      setJwtTokenState(data.token);
      return data;
    } catch (error) {
      console.error('Failed to refresh JWT token:', error);
      throw error;
    } finally {
      setIsRefreshing(false);
    }
  }, [baseUrl, jwtToken, storeJwtToken]);

  useEffect(() => {
    if (fetchedToken) {
      setJwtTokenState(fetchedToken);
    }
  }, [fetchedToken]);

  const setJwtToken = useCallback(
    async (token: string | null) => {
      try {
        await storeJwtToken(token);
        setJwtTokenState(token);
      } catch (err) {
        console.warn('Failed to save JWT token to custom object:', err);
        setJwtTokenState(token);
      }
    },
    [storeJwtToken]
  );

  const clearAuth = useCallback(() => {
    setJwtTokenState(null);
  }, []);

  const value: AuthContextValue = {
    jwtToken,
    isAuthenticated: !!jwtToken,
    isExpired,
    isRefreshing,
    setJwtToken,
    clearAuth,
    refreshJwt,
    loading: fetchLoading || setLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
