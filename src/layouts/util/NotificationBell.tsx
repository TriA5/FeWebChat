import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NotificationDisplay,
  getNotifications,
  countUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  formatNotificationTime,
  getNotificationStyle
} from '../../api/notification/notificationApi';
import { getUserId } from '../../api/util/JwtService';
import './NotificationBell.css';

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const currentUserId = getUserId();

  const loadNotifications = async () => {
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      const data = await getNotifications(currentUserId);
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    if (!currentUserId) return;
    
    try {
      const count = await countUnreadNotifications(currentUserId);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  // Load thông báo khi mở dropdown
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUserId]);

  // Load số lượng thông báo chưa đọc định kỳ
  useEffect(() => {
    if (currentUserId) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000); // Mỗi 30s
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleNotificationClick = async (notification: NotificationDisplay) => {
    if (!currentUserId) return;

    // Đánh dấu đã đọc
    if (!notification.isRead) {
      try {
        await markAsRead(notification.id, currentUserId);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }

    // Điều hướng đến nội dung liên quan
    setIsOpen(false);
    navigate(`/poster/${notification.referenceId}`);
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;

    try {
      await markAllAsRead(currentUserId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
      alert('Không thể đánh dấu tất cả là đã đọc');
    }
  };

  const handleDelete = async (notificationId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!currentUserId) return;

    if (!window.confirm('Bạn có chắc muốn xóa thông báo này?')) return;

    try {
      await deleteNotification(notificationId, currentUserId);
      const deletedNotif = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (deletedNotif && !deletedNotif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Không thể xóa thông báo');
    }
  };

  return (
    <div className="notification-bell" ref={dropdownRef}>
      <button className="notification-bell__button" onClick={handleToggle}>
        <span className="notification-bell__icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-dropdown__header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button
                className="notification-dropdown__mark-all"
                style={{width: '300px'}}
                onClick={handleMarkAllAsRead}
              >
                Đánh dấu tất cả là đã đọc
              </button>
            )}
          </div>

          <div className="notification-dropdown__body">
            {loading ? (
              <div className="notification-dropdown__loading">
                <div className="spinner-small"></div>
                <p>Đang tải...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-dropdown__empty">
                <span className="notification-dropdown__empty-icon">🔔</span>
                <p>Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="notification-list">
                {notifications.map(notification => {
                  const style = getNotificationStyle(notification.notificationType);
                  return (
                    <div
                      key={notification.id}
                      className={`notification-item ${
                        !notification.isRead ? 'notification-item--unread' : ''
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-item__avatar-wrapper">
                        {notification.actorAvatar ? (
                          <img
                            src={notification.actorAvatar}
                            alt={notification.actorName}
                            className="notification-item__avatar"
                          />
                        ) : (
                          <div className="notification-item__avatar notification-item__avatar--default">
                            👤
                          </div>
                        )}
                        <div
                          className={`notification-item__type-icon notification-item__type-icon--${notification.notificationType.toLowerCase()}`}
                        >
                          {style.icon}
                        </div>
                      </div>

                      <div className="notification-item__content">
                        <p className="notification-item__text">
                          <strong>{notification.actorName}</strong>{' '}
                          {notification.content}
                        </p>
                        <div className="notification-item__meta">
                          <span className="notification-item__time">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                          {!notification.isRead && (
                            <span className="notification-item__unread-dot">•</span>
                          )}
                        </div>
                      </div>

                      <button
                        className="notification-item__delete"
                        onClick={(e) => handleDelete(notification.id, e)}
                        title="Xóa thông báo"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-dropdown__footer">
              <button
                className="notification-dropdown__view-all"
                style={{ width: '400px' }}
                onClick={() => {
                  setIsOpen(false);
                  navigate('/notifications');
                }}
              >
                Xem tất cả thông báo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
