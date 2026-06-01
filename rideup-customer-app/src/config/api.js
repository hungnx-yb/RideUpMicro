import Constants from 'expo-constants';

// Lấy IP động từ Metro Bundler (Expo) đang chạy
const getHostUri = () => {
  const hostUri = Constants?.expoConfig?.hostUri;
  if (hostUri) {
    return hostUri.split(':')[0]; // Trả về '192.168.x.x'
  }
  return 'localhost';
};

const IP_ADDRESS = getHostUri();

// Cổng của API Gateway
const GATEWAY_PORT = 8080;

export const BASE_URL = `http://${IP_ADDRESS}:${GATEWAY_PORT}`;
export const WEBSOCKET_URL = `http://${IP_ADDRESS}:${GATEWAY_PORT}/chat/ws`;

console.log('🔗 Đang kết nối Backend tại:', BASE_URL);
