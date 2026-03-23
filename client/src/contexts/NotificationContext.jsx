import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get('/api/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [isAuthenticated]);

  // Connect WebSocket
  const connectWebSocket = useCallback(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `ws://localhost:5000/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[WS] Connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'unread_count') {
          setUnreadCount(data.count);
        }

        if (data.type === 'new_notification') {
          setNotifications(prev => [data.notification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      } catch (err) {
        console.error('[WS] Message parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      // Auto-reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(() => {
        if (isAuthenticated) connectWebSocket();
      }, 3000);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };

    wsRef.current = ws;
  }, [isAuthenticated]);

  // Connect on auth
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [isAuthenticated, connectWebSocket, fetchNotifications]);

  // Mark single notification as read
  const markAsRead = async (notificationId) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const value = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
