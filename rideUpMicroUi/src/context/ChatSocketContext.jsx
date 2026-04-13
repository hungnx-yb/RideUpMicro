import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import useAuth from "../hooks/useAuth";
import { createChatSocketClient } from "../services/chatSocket";

const ChatSocketContext = createContext(null);

export function ChatSocketProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const clientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (clientRef.current) {
        clientRef.current.deactivate();
        clientRef.current = null;
      }
      setIsConnected(false);
      return undefined;
    }

    const client = createChatSocketClient({
      token,
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
    }),
    [isConnected]
  );

  return <ChatSocketContext.Provider value={value}>{children}</ChatSocketContext.Provider>;
}

export function useChatSocket() {
  return useContext(ChatSocketContext);
}
