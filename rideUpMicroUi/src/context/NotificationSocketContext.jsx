import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import { getUnreadNotificationCountApi } from "../services/notificationApi";
import { createNotificationSocketClient } from "../services/notificationSocket";

const NotificationSocketContext = createContext(null);

function normalizeUnreadCount(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function NotificationSocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const clientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotification, setLastNotification] = useState(null);

  const refreshUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCountApi();
      setUnreadCount(normalizeUnreadCount(count));
    } catch {
      setUnreadCount((prev) => normalizeUnreadCount(prev));
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      setIsConnected(false);
      setUnreadCount(0);
      setLastNotification(null);
      return undefined;
    }

    refreshUnreadCount();

    const client = createNotificationSocketClient({
      token,
      onNotification: (payload) => {
        setLastNotification(payload || null);
        if (payload?.status === "UNREAD") {
          setUnreadCount((prev) => normalizeUnreadCount(prev + 1));
        }
      },
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onError: () => setIsConnected(false),
    });

    clientRef.current = client;
    client.activate();

    return () => {
      client.deactivate();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, token]);

  const value = useMemo(
    () => ({
      client: clientRef.current,
      isConnected,
      unreadCount,
      lastNotification,
      setUnreadCount,
      refreshUnreadCount,
    }),
    [isConnected, unreadCount, lastNotification]
  );

  return <NotificationSocketContext.Provider value={value}>{children}</NotificationSocketContext.Provider>;
}

export function useNotificationSocket() {
  return useContext(NotificationSocketContext);
}
