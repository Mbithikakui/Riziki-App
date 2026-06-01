import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { Storage } from '../utils/storage';
import { login as apiLogin, logout as apiLogout, UserData } from '../api/auth';
import PasskeyRevealModal from '../components/PasskeyRevealModal';

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]             = useState<UserData | null>(null);
  const [isLoading, setIsLoading]   = useState<boolean>(true);
  const [error, setError]           = useState<string | null>(null);
  // Separate flag — drives navigation reliably, avoids stale user state conditions
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  // ── PASSKEY ONBOARDING MODAL STATE ───────────────────────────────────────
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [pendingPasskey, setPendingPasskey] = useState<string>('');

  // On app initialization / page refresh — force clear the session and request fresh credentials
  useEffect(() => {
    const handleRefreshPolicy = async () => {
      try {
        console.log('[AuthContext] Dashboard reloaded. Clearing persistent storage tokens to enforce re-authentication...');
        
        // Scrub all persistent tokens to guarantee the user cannot bypass the login wall on reload
        await Storage.multiRemove(['access_token', 'refresh_token']);
      } catch (err) {
        console.warn('[AuthContext] Failed to clear tokens during initialization:', err);
      } finally {
        // Enforce guest state properties and finish the loading transition
        setUser(null);
        setIsLoggedIn(false);
        setIsLoading(false);
      }
    };

    handleRefreshPolicy();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiLogin({ username, password });
      console.log('[AuthContext] Login success:', data.user.username);

      // Verify tokens were written properly by the automated internal api client hooks
      const savedToken = await Storage.getItem('access_token');
      console.log('[AuthContext] Token saved to storage:', savedToken ? 'YES' : 'NO');

      // Populate user data record tree structures
      setUser(data.user);

      // Check if onboarding/passkey payload configuration properties exist
      if (data.onboarding?.transaction_passkey) {
        console.log('[AuthContext] Onboarding payload caught. Halting routing sequence to render passkey modal...');
        setPendingPasskey(data.onboarding.transaction_passkey);
        setModalVisible(true);
        // We explicitly do NOT set isLoggedIn(true) yet. This keeps them on the auth stack layout
      } else {
        // Standard returning user layout routing paths
        setIsLoggedIn(true);
      }
    } catch (err: unknown) {
      console.error('[AuthContext] Login failed:', err);
      const message =
        (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data?.error ??
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Login failed. Please check your credentials and try again.';
      
      setError(message);
      setIsLoggedIn(false);
      setUser(null);
      throw err; // Re-throw allowing visual UI screen trees to capture local exceptions
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await apiLogout();
    } catch (err) {
      console.warn('[AuthContext] Logout API endpoint trace call error (ignored):', err);
    } finally {
      setUser(null);
      setIsLoggedIn(false); // Clean flag triggers navigation context re-routing away from protected stacks
      setModalVisible(false);
      setPendingPasskey('');
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const handleModalAcknowledge = useCallback(() => {
    setModalVisible(false);
    setPendingPasskey('');
    // Clear out the modal overlay safely before triggering the route state swap mapping
    setIsLoggedIn(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn,
        login,
        logout,
        error,
        clearError,
      }}
    >
      {children}
      
      {/* Universal onboarding layout component renderer */}
      <PasskeyRevealModal
        visible={modalVisible}
        passkey={pendingPasskey}
        onAcknowledge={handleModalAcknowledge}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider context wrapper instance.');
  return ctx;
};