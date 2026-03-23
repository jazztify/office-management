import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../../contexts/NotificationContext';

const NOTIFICATION_ICONS = {
  leave_request: '📋',
  leave_approved: '✅',
  leave_rejected: '❌',
  overtime_request: '⏰',
  overtime_approved: '✅',
  overtime_rejected: '❌',
  early_out_request: '🚪',
  early_out_approved: '✅',
  early_out_rejected: '❌',
  half_day_request: '🌗',
  half_day_approved: '✅',
  half_day_rejected: '❌',
  general: '🔔',
};

function timeAgo(dateStr) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
  };

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={() => { markAllAsRead(); }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <span className="empty-icon">📭</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 30).map((notif) => (
                <div
                  key={notif._id}
                  className={`notification-item ${notif.isRead ? '' : 'unread'}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <span className="notif-icon">
                    {NOTIFICATION_ICONS[notif.type] || '🔔'}
                  </span>
                  <div className="notif-content">
                    <div className="notif-title">{notif.title}</div>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-time">{timeAgo(notif.createdAt)}</div>
                  </div>
                  {!notif.isRead && <span className="notif-unread-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
