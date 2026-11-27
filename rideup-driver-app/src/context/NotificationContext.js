import React, { createContext, useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { apiService } from '../services/apiService';
import { notificationSocket } from '../services/notificationSocket';
import { navigate } from '../services/navigationRef';

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
        
        // Cập nhật số đỏ trên chuông thông báo ngay lập tức
        incrementUnreadCount();
        
        let metadata = {};
        try {
          metadata = typeof newNoti?.metadata === 'string' ? JSON.parse(newNoti.metadata) : (newNoti?.metadata || {});
        } catch (e) {}

        const targetRequestId = metadata.tripRequestId || metadata.requestId || metadata.id;
        const notiType = (metadata.type || newNoti?.type || '').toUpperCase();

        // Chỉ hiện gợi ý nhanh cho tin tìm xe mới trên Chợ chuyến xe (TRIP_REQUEST_CREATED).
        // Toàn bộ các thông báo khác (hủy chuyến, hủy vé, hoàn tiền, duyệt đơn, đổi lộ trình...)
        // KHÔNG bật Alert popup gây phiền nhiễu mà chỉ cập nhật chuông thông báo.
        if (notiType === 'TRIP_REQUEST_CREATED' && targetRequestId) {
          Alert.alert(
            `🔔 ${newNoti.title || 'Có khách tìm xe mới!'}`,
            newNoti.message || 'Có khách vừa đăng nhu cầu chuyến đi trên tuyến bạn chạy.',
            [
              { text: 'Để sau', style: 'cancel' },
              {
                text: 'Xem & Báo Giá',
                onPress: () => {
                  navigate('MainTabs', {
                    screen: 'Marketplace',
                    params: { 
                      targetRequestId: targetRequestId,
                      startProvinceId: metadata.startProvinceId,
                      endProvinceId: metadata.endProvinceId,
                    },
                  });
                },
              },
            ]
          );
        }
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
