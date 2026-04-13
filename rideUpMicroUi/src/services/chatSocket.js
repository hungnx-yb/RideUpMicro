import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const chatPath = import.meta.env.VITE_CHAT_SERVICE_PATH || "/api/chat";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedChatPath = chatPath.startsWith("/") ? chatPath : `/${chatPath}`;
const chatBaseUrl = `${normalizedGatewayUrl}${normalizedChatPath}`;

function getAuthToken() {
  return localStorage.getItem("auth_token") || "";
}

export function createChatSocketClient({
  onMessage,
  onRead,
  onConnect,
  onError,
  onDisconnect,
  token,
}) {
  const resolvedToken = token || getAuthToken();
  const client = new Client({
    webSocketFactory: () => new SockJS(`${chatBaseUrl}/ws/chat`),
    connectHeaders: resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {},
    debug: () => {},
    reconnectDelay: 5000,
    onConnect: () => {
      if (typeof onMessage === "function") {
        client.subscribe("/user/queue/messages", (frame) => {
          if (!frame?.body) {
            return;
          }
          try {
            const payload = JSON.parse(frame.body);
            onMessage(payload);
          } catch (error) {
            onError?.(error);
          }
        });
      }

      if (typeof onRead === "function") {
        client.subscribe("/user/queue/read", (frame) => {
          if (!frame?.body) {
            return;
          }
          try {
            const payload = JSON.parse(frame.body);
            onRead(payload);
          } catch (error) {
            onError?.(error);
          }
        });
      }

      onConnect?.();
    },
    onDisconnect: () => {
      onDisconnect?.();
    },
    onStompError: (frame) => {
      onError?.(frame);
    },
    onWebSocketError: (event) => {
      onError?.(event);
    },
  });

  return client;
}
