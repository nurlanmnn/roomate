import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

type NetworkContextValue = {
  /**
   * True when device reports it has an internet connection.
   * Null while the initial state is unknown.
   */
  isOnline: boolean | null;
  lastState: NetInfoState | null;
};

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

/**
 * How long a reported "offline" state must persist before we actually surface the
 * offline banner. This smooths over the brief window right after the app is
 * foregrounded — the OS often emits a transient `isInternetReachable: false`
 * while it re-validates connectivity, which would otherwise cause the banner
 * to flash even though the user has internet.
 */
const OFFLINE_DEBOUNCE_MS = 3500;

/**
 * Derive a simple "online" bool from a NetInfo state. Prefers `isInternetReachable`
 * (an actual reachability probe) over raw `isConnected` (which is just "we're on a
 * network" and is true for e.g. captive-portal Wi-Fi without internet).
 */
const deriveOnline = (state: NetInfoState): boolean | null => {
  if (state.isInternetReachable === null) {
    return state.isConnected ?? null;
  }
  return Boolean(state.isInternetReachable);
};

export const NetworkProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [lastState, setLastState] = useState<NetInfoState | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearOfflineTimer = useCallback(() => {
    if (offlineTimerRef.current) {
      clearTimeout(offlineTimerRef.current);
      offlineTimerRef.current = null;
    }
  }, []);

  const handleState = useCallback(
    (state: NetInfoState) => {
      setLastState(state);
      const reachable = deriveOnline(state);

      if (reachable === true) {
        clearOfflineTimer();
        setIsOnline(true);
      } else if (reachable === false) {
        clearOfflineTimer();
        offlineTimerRef.current = setTimeout(() => {
          offlineTimerRef.current = null;
          setIsOnline(false);
        }, OFFLINE_DEBOUNCE_MS);
      }
    },
    [clearOfflineTimer]
  );

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(handleState);
    return () => {
      unsubscribe();
      clearOfflineTimer();
    };
  }, [handleState, clearOfflineTimer]);

  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      if (status === 'active') {
        clearOfflineTimer();
        NetInfo.refresh()
          .then(handleState)
          .catch(() => {});
      }
    };
    const sub = AppState.addEventListener('change', onAppStateChange);
    return () => sub.remove();
  }, [handleState, clearOfflineTimer]);

  const value = useMemo<NetworkContextValue>(
    () => ({ isOnline, lastState }),
    [isOnline, lastState]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = (): NetworkContextValue => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider');
  return ctx;
};

