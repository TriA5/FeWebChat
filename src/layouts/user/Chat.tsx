import React, { useState, useEffect, useRef } from 'react';
import { getUserInfo } from '../../api/user/loginApi';
import './Chat.css';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  isOwn: boolean;
}

interface ChatRoom {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
  isOnline: boolean;
  participants: string[];
}

interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  isOnline: boolean;
}

const Chat: React.FC = () => {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatRoom, setSelectedChatRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const user = getUserInfo();
    if (user) {
      setCurrentUser({
        id: user.id || '1',
        username: user.username || 'user',
        firstName: user.lastName || 'User',
        lastName: user.lastName || '',
        avatar: user.avatar || '',
        isOnline: true
      });
    }
    loadChatRooms();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Mock data - Thay thế bằng API calls thực tế
  const loadChatRooms = () => {
    const mockRooms: ChatRoom[] = [
      {
        id: '1',
        name: 'Nhóm Công Việc',
        avatar: '',
        lastMessage: 'Cuộc họp lúc 2h chiều nhé',
        lastMessageTime: new Date(Date.now() - 10 * 60 * 1000),
        unreadCount: 3,
        isOnline: true,
        participants: ['1', '2', '3']
      },
      {
        id: '2',
        name: 'Nguyễn Văn A',
        avatar: '',
        lastMessage: 'OK, tôi sẽ gửi file cho bạn',
        lastMessageTime: new Date(Date.now() - 30 * 60 * 1000),
        unreadCount: 0,
        isOnline: true,
        participants: ['1', '2']
      },
      {
        id: '3',
        name: 'Trần Thị B',
        avatar: '',
        lastMessage: 'Cảm ơn bạn nhiều!',
        lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        unreadCount: 1,
        isOnline: false,
        participants: ['1', '3']
      },
      {
        id: '4',
        name: 'Nhóm Bạn Bè',
        avatar: '',
        lastMessage: 'Hẹn gặp cuối tuần nhé',
        lastMessageTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        unreadCount: 0,
        isOnline: false,
        participants: ['1', '2', '3', '4']
      }
    ];
    setChatRooms(mockRooms);
  };

  const loadMessages = (roomId: string) => {
    const mockMessages: Message[] = [
      {
        id: '1',
        senderId: '2',
        senderName: 'Nguyễn Văn A',
        content: 'Chào bạn! Bạn có khỏe không?',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        type: 'text',
        isOwn: false
      },
      {
        id: '2',
        senderId: currentUser?.id || '1',
        senderName: currentUser?.firstName || 'Bạn',
        content: 'Chào! Tôi khỏe, cảm ơn bạn',
        timestamp: new Date(Date.now() - 50 * 60 * 1000),
        type: 'text',
        isOwn: true
      },
      {
        id: '3',
        senderId: '2',
        senderName: 'Nguyễn Văn A',
        content: 'Tuần này bạn có rảnh không? Mình muốn hẹn gặp',
        timestamp: new Date(Date.now() - 40 * 60 * 1000),
        type: 'text',
        isOwn: false
      },
      {
        id: '4',
        senderId: currentUser?.id || '1',
        senderName: currentUser?.firstName || 'Bạn',
        content: 'Có chứ, bạn muốn gặp khi nào?',
        timestamp: new Date(Date.now() - 35 * 60 * 1000),
        type: 'text',
        isOwn: true
      },
      {
        id: '5',
        senderId: '2',
        senderName: 'Nguyễn Văn A',
        content: 'OK, tôi sẽ gửi file cho bạn',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        type: 'text',
        isOwn: false
      }
    ];
    setMessages(mockMessages);
  };

  const handleSelectChatRoom = (room: ChatRoom) => {
    setSelectedChatRoom(room);
    loadMessages(room.id);
    
    // Mark as read
    setChatRooms(prev => 
      prev.map(r => 
        r.id === room.id ? { ...r, unreadCount: 0 } : r
      )
    );
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedChatRoom || !currentUser) return;

    const message: Message = {
      id: Date.now().toString(),
      senderId: currentUser.id,
      senderName: currentUser.firstName,
      senderAvatar: currentUser.avatar,
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text',
      isOwn: true
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
    
    // Update last message in chat room
    setChatRooms(prev => 
      prev.map(room => 
        room.id === selectedChatRoom.id 
          ? { ...room, lastMessage: message.content, lastMessageTime: message.timestamp }
          : room
      )
    );

    // Focus input
    inputRef.current?.focus();
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60 * 1000) return 'Vừa xong';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} phút trước`;
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} giờ trước`;
    if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  };

  const formatMessageTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const filteredChatRooms = chatRooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="chat-container">
        <div className="chat-login-required">
          <h3>Vui lòng đăng nhập để sử dụng chat</h3>
          <a href="/login" className="login-link">Đăng nhập ngay</a>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Sidebar */}
      <div className={`chat-sidebar ${isSidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <h2>Tin nhắn</h2>
          <button 
            className="sidebar-toggle"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? '←' : '→'}
          </button>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Tìm kiếm cuộc trò chuyện..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <div className="search-icon">🔍</div>
        </div>

        <div className="chat-rooms-list">
          {filteredChatRooms.map(room => (
            <div
              key={room.id}
              className={`chat-room-item ${selectedChatRoom?.id === room.id ? 'active' : ''}`}
              onClick={() => handleSelectChatRoom(room)}
            >
              <div className="room-avatar">
                {room.avatar ? (
                  <img src={room.avatar} alt={room.name} />
                ) : (
                  <div className="avatar-placeholder">
                    {room.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {room.isOnline && <div className="online-indicator"></div>}
              </div>
              
              <div className="room-info">
                <div className="room-header">
                  <h4 className="room-name">{room.name}</h4>
                  {room.lastMessageTime && (
                    <span className="last-time">{formatTime(room.lastMessageTime)}</span>
                  )}
                </div>
                
                <div className="room-footer">
                  <p className="last-message">{room.lastMessage || 'Chưa có tin nhắn'}</p>
                  {room.unreadCount > 0 && (
                    <span className="unread-badge">{room.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {selectedChatRoom ? (
          <>
            {/* Chat Header */}
            <div className="chat-header">
              <div className="chat-info">
                <div className="chat-avatar">
                  {selectedChatRoom.avatar ? (
                    <img src={selectedChatRoom.avatar} alt={selectedChatRoom.name} />
                  ) : (
                    <div className="avatar-placeholder">
                      {selectedChatRoom.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {selectedChatRoom.isOnline && <div className="online-indicator"></div>}
                </div>
                <div>
                  <h3>{selectedChatRoom.name}</h3>
                  <p className="chat-status">
                    {selectedChatRoom.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                  </p>
                </div>
              </div>
              
              <div className="chat-actions">
                <button className="action-btn">📞</button>
                <button className="action-btn">📹</button>
                <button className="action-btn">⚙️</button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`message ${message.isOwn ? 'own' : 'other'}`}
                >
                  {!message.isOwn && (
                    <div className="message-avatar">
                      {message.senderAvatar ? (
                        <img src={message.senderAvatar} alt={message.senderName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {message.senderName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="message-content">
                    {!message.isOwn && (
                      <span className="message-sender">{message.senderName}</span>
                    )}
                    <div className="message-bubble">
                      <p>{message.content}</p>
                    </div>
                    <span className="message-time">
                      {formatMessageTime(message.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form className="message-input-area" onSubmit={handleSendMessage}>
              <div className="input-container">
                <button type="button" className="attachment-btn">📎</button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Nhập tin nhắn..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="message-input"
                />
                <button type="button" className="emoji-btn">😊</button>
                <button 
                  type="submit" 
                  className="send-btn"
                  disabled={!newMessage.trim()}
                >
                  ➤
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <div className="welcome-message">
              <h3>Chào mừng đến với ChatWeb!</h3>
              <p>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
