import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/notifications';
const USER_API_BASE_URL = 'http://localhost:8080/api/users';

// Interface cho Notification - khớp với backend
export interface NotificationDTO {
  idNotification: string;      // Backend field name
  recipientId: string;
  actorId: string;
  actorName?: string;           // Optional - sẽ fetch thêm
  actorAvatar?: string;         // Optional - sẽ fetch thêm
  notificationType: 'LIKE_POSTER' | 'COMMENT_POSTER' | 'REPLY_COMMENT' | 'LIKE_COMMENT';
  referenceId: string;
  message: string;              // Backend field name (content)
  isRead: boolean;
  createdAt: string;
  readAt?: string;
}

// Helper type để sử dụng trong code
export interface NotificationDisplay extends NotificationDTO {
  id: string;                   // Alias cho idNotification
  content: string;              // Alias cho message
}

// Fetch thông tin user từ actorId
const fetchActorInfo = async (actorId: string) => {
  try {
    const response = await axios.get(`${USER_API_BASE_URL}/${actorId}`);
    // Ưu tiên lấy firstName + lastName, fallback về username
    const fullName = `${response.data.firstName || ''} ${response.data.lastName || ''}`.trim();
    return {
      actorName: fullName || response.data.username || 'Người dùng',
      actorAvatar: response.data.avatar
    };
  } catch (error) {
    console.error(`Error fetching actor info for ${actorId}:`, error);
    return {
      actorName: 'Người dùng',
      actorAvatar: undefined
    };
  }
};

// Transform notification từ backend sang frontend format
const transformNotification = async (notif: any): Promise<NotificationDisplay> => {
  const actorInfo = await fetchActorInfo(notif.actorId);
  
  return {
    ...notif,
    id: notif.idNotification,
    content: notif.message,
    actorName: actorInfo.actorName,
    actorAvatar: actorInfo.actorAvatar
  };
};

// Lấy tất cả thông báo của user
export const getNotifications = async (userId: string): Promise<NotificationDisplay[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}`, {
      params: { userId }
    });
    
    // Transform và fetch thông tin actor cho mỗi notification
    const notifications = await Promise.all(
      response.data.map((notif: any) => transformNotification(notif))
    );
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Lấy thông báo chưa đọc
export const getUnreadNotifications = async (userId: string): Promise<NotificationDisplay[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/unread`, {
      params: { userId }
    });
    
    // Transform và fetch thông tin actor cho mỗi notification
    const notifications = await Promise.all(
      response.data.map((notif: any) => transformNotification(notif))
    );
    
    return notifications;
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
};

// Đếm số thông báo chưa đọc
export const countUnreadNotifications = async (userId: string): Promise<number> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/unread/count`, {
      params: { userId }
    });
    // Backend trả về object {userId, message, unreadCount}, lấy unreadCount
    if (typeof response.data === 'object' && response.data.unreadCount !== undefined) {
      return response.data.unreadCount;
    }
    // Nếu backend trả về số trực tiếp
    return typeof response.data === 'number' ? response.data : 0;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0; // Return 0 thay vì throw để tránh crash
  }
};

// Đánh dấu một thông báo là đã đọc
export const markAsRead = async (notificationId: string, userId: string): Promise<void> => {
  try {
    await axios.put(`${API_BASE_URL}/${notificationId}/read`, null, {
      params: { userId }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Đánh dấu tất cả thông báo là đã đọc
export const markAllAsRead = async (userId: string): Promise<void> => {
  try {
    await axios.put(`${API_BASE_URL}/read-all`, null, {
      params: { userId }
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Xóa thông báo
export const deleteNotification = async (notificationId: string, userId: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/${notificationId}`, {
      params: { userId }
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Format thời gian hiển thị
export const formatNotificationTime = (timestamp: string): string => {
  const now = new Date();
  const notifTime = new Date(timestamp);
  const diffMs = now.getTime() - notifTime.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  
  return notifTime.toLocaleDateString('vi-VN');
};

// Lấy icon và màu sắc cho từng loại thông báo
export const getNotificationStyle = (type: NotificationDTO['notificationType']) => {
  switch (type) {
    case 'LIKE_POSTER':
      return { icon: '❤️', color: '#e41e3f', bgColor: '#ffe7e7' };
    case 'COMMENT_POSTER':
      return { icon: '💬', color: '#1877f2', bgColor: '#e7f3ff' };
    case 'REPLY_COMMENT':
      return { icon: '↩️', color: '#667eea', bgColor: '#e7e9ff' };
    case 'LIKE_COMMENT':
      return { icon: '👍', color: '#42b883', bgColor: '#e7ffe9' };
    default:
      return { icon: '🔔', color: '#65676b', bgColor: '#f0f2f5' };
  }
};
