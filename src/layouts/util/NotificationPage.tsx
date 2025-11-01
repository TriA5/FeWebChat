import React, { useState, useEffect } from 'react';
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
import './NotificationPage.css';

const NotificationPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  const currentUserId = getUserId();

  const loadData = async () => {
    if (!currentUserId) return;

    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        getNotifications(currentUserId),
        countUnreadNotifications(currentUserId)
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUserId) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

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

    // Điều hướng
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

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications;

  return (
    <div className="notification-page">
      <div className="notification-page__container">
        <div className="notification-page__header">
          <h1>Thông báo</h1>
          <button className="btn-back-to-home" onClick={() => navigate('/home')}>
            ← Quay lại
          </button>
        </div>

        <div className="notification-page__controls">
          <div className="notification-tabs">
            <button
              className={`notification-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              className={`notification-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              className="btn-mark-all-read"
              onClick={handleMarkAllAsRead}
            >
              Đánh dấu tất cả là đã đọc
            </button>
          )}
        </div>

        <div className="notification-page__content">
          {loading ? (
            <div className="notification-page__loading">
              <div className="spinner"></div>
              <p>Đang tải thông báo...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="notification-page__empty">
              <span className="empty-icon">🔔</span>
              <h3>{filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}</h3>
              <p>Các thông báo mới sẽ hiển thị ở đây</p>
            </div>
          ) : (
            <div className="notification-page__list">
              {filteredNotifications.map(notification => {
                const style = getNotificationStyle(notification.notificationType);
                return (
                  <div
                    key={notification.id}
                    className={`notif-card ${
                      !notification.isRead ? 'notif-card--unread' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notif-card__avatar-wrapper">
                      {notification.actorAvatar ? (
                        <img
                          src={notification.actorAvatar}
                          alt={notification.actorName}
                          className="notif-card__avatar"
                        />
                      ) : (
                        <div className="notif-card__avatar notif-card__avatar--default">
                          👤
                        </div>
                      )}
                      <div
                        className={`notif-card__type-icon notif-card__type-icon--${notification.notificationType.toLowerCase()}`}
                      >
                        {style.icon}
                      </div>
                    </div>

                    <div className="notif-card__content">
                      <p className="notif-card__text">
                        <strong>{notification.actorName}</strong>{' '}
                        {notification.content}
                      </p>
                      <div className="notif-card__meta">
                        <span className="notif-card__time">
                          {formatNotificationTime(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <span className="notif-card__unread-badge">Mới</span>
                        )}
                      </div>
                    </div>

                    <button
                      className="notif-card__delete"
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
      </div>
    </div>
  );
};

export default NotificationPage;
