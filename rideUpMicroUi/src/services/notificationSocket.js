import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";

const gatewayUrl = import.meta.env.VITE_API_GATEWAY_URL || "http://localhost:8080";
const notificationPath = import.meta.env.VITE_NOTIFICATION_SERVICE_PATH || "/api/notification";
const normalizedGatewayUrl = gatewayUrl.replace(/\/$/, "");
const normalizedNotificationPath = notificationPath.startsWith("/") ? notificationPath : `/${notificationPath}`;
const notificationBaseUrl = `${normalizedGatewayUrl}${normalizedNotificationPath}`;

function getAuthToken() {
  return localStorage.getItem("auth_token") || "";
}

export function createNotificationSocketClient({ onNotification, onConnect, onError, onDisconnect, token }) {
  const resolvedToken = token || getAuthToken();
  const client = new Client({
    webSocketFactory: () => new SockJS(`${notificationBaseUrl}/ws/notifications`),
    connectHeaders: resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {},
    debug: () => {},
    reconnectDelay: 5000,
    onConnect: () => {
      if (typeof onNotification === "function") {
        client.subscribe("/user/queue/notifications", (frame) => {
          if (!frame?.body) {
            return;
          }
          try {
            const payload = JSON.parse(frame.body);
            onNotification(payload);
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
