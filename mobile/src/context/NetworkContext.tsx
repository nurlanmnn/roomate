import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

export const NetworkProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [lastState, setLastState] = useState<NetInfoState | null>(null);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setLastState(state);
      // Prefer isInternetReachable when available (more accurate than just being "connected" to a LAN).
      if (state.isInternetReachable === null) {
        setIsOnline(state.isConnected ?? null);
      } else {
        setIsOnline(Boolean(state.isInternetReachable));
      }
    });
    return unsubscribe;
  }, []);

  const value = useMemo<NetworkContextValue>(() => ({ isOnline, lastState }), [isOnline, lastState]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
};

export const useNetwork = (): NetworkContextValue => {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider');
  return ctx;
};

