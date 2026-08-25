import React, { createContext, useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { notificationSocket } from '../services/notificationSocket';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiService.getUnreadNotificationCount();
      if (res?.data?.result !== undefined) {
        setUnreadCount(res.data.result);
      } else if (typeof res?.data === 'number') {
        setUnreadCount(res.data);
      }
    } catch (error) {
      console.log('Error fetching unread notification count:', error);
    }
  }, []);

  const incrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => prev + 1);
  }, []);

  const decrementUnreadCount = useCallback(() => {
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const clearUnreadCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    let unsubscribe = null;
    let isMounted = true;

    const setupSocket = async () => {
      // 1. Fetch initial count
      await fetchUnreadCount();

      // 2. Connect to WebSocket
      if (!notificationSocket.isConnected) {
        await notificationSocket.connect();
      }

      // 3. Subscribe to real-time events
      unsubscribe = notificationSocket.subscribe((newNoti) => {
        if (!isMounted) return;
        
        // Cập nhật số đỏ ngay lập tức
        incrementUnreadCount();
        
        // Tuỳ chọn: Ở đây bạn có thể dùng Alert hoặc react-native-toast-message để hiện popup đẩy trên góc màn hình!
        // console.log("New Notification Received:", newNoti);
      });
    };

    setupSocket();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      // notificationSocket.disconnect(); // Không ngắt để các tab khác vẫn xài chung được
    };
  }, [fetchUnreadCount, incrementUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        fetchUnreadCount,
        incrementUnreadCount,
        decrementUnreadCount,
        clearUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
