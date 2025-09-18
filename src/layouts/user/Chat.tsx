import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getUserInfo } from '../../api/user/loginApi';
import { connect as wsConnect, subscribe as wsSubscribe, send as wsSend } from '../../api/websocket/stompClient';
import { getMessages as getMessagesApi, listConversations } from '../../api/chat/chatApi';
import { getFriendsList } from '../../api/user/friendshipApi';
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
  const [friendMap, setFriendMap] = useState<Record<string, { name: string; avatar?: string }>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // (Effects moved below loadMessages definition)

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // (Removed: loadChatRooms; init effect below will fetch conversations)

  const loadMessages = useCallback(async (roomId: string) => {
    try {
      const msgs = await getMessagesApi(roomId);
      const me = getUserInfo();
      const myId = me?.id;
      const myName = me?.username || 'Tôi';
      const transformed: Message[] = msgs.map(m => ({
        id: m.id,
        senderId: m.senderId,
        senderName: m.senderId === myId ? myName : 'Bạn bè',
        content: m.content,
        timestamp: new Date(m.createdAt),
        type: 'text',
        isOwn: m.senderId === myId
      }));
      setMessages(transformed);
    } catch (e) {
      console.error('Load messages failed', e);
      setMessages([]);
    }
  }, []);

  // Initialize current user and load friends + conversations
  useEffect(() => {
    const init = async () => {
      const user = getUserInfo();
      if (user) {
        setCurrentUser({
          id: user.id || '1',
          username: user.username || 'user',
          firstName: user.lastName || 'User',
          lastName: user.lastName || '',
          avatar: user.avatar || '',
          isOnline: true,
        });
      }
      try {
        const me = getUserInfo();
        if (!me?.id) return;
        // Load friends and build lookup
        const friends = await getFriendsList();
        const map: Record<string, { name: string; avatar?: string }> = {};
        friends.forEach(f => {
          if (f.userId) {
            map[f.userId] = { name: `${f.firstName} ${f.lastName}`.trim(), avatar: f.avatar };
          }
        });
        setFriendMap(map);
        const convs = await listConversations(me.id);
        const rooms: ChatRoom[] = convs.map(c => {
          const otherId = c.participant1Id === me.id ? c.participant2Id : c.participant1Id;
          const info = map[otherId];
          return {
            id: c.id,
            name: info?.name || 'Cuộc trò chuyện',
            avatar: info?.avatar || '',
            lastMessage: '',
            lastMessageTime: undefined,
            unreadCount: 0,
            isOnline: true,
            participants: [c.participant1Id, c.participant2Id],
          };
        });
        setChatRooms(rooms);
      } catch (e) {
        console.error('Init chat failed', e);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    init();
  }, []);

  // When rooms are loaded and none selected, pick first and load messages
  useEffect(() => {
    const selectFirst = async () => {
      if (!selectedChatRoom && chatRooms.length > 0) {
        const first = chatRooms[0];
        setSelectedChatRoom(first);
        await loadMessages(first.id);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    selectFirst();
  }, [chatRooms, selectedChatRoom, loadMessages]);

  const handleSelectChatRoom = async (room: ChatRoom) => {
    try {
      setSelectedChatRoom(room);
      await loadMessages(room.id);
    } catch (e) {
      console.error('Select chat room failed', e);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatRoom || !currentUser) return;
    const content = newMessage.trim();
    setNewMessage('');

    // send via websocket
    wsSend('/app/chat.send', {
      conversationId: selectedChatRoom.id,
      senderId: currentUser.id,
      content,
    });

    // Focus input
    inputRef.current?.focus();
  };

  // websocket subscriptions
  useEffect(() => {
    const me = getUserInfo();
    let subConv: any = null;
    let subMsg: any = null;
    wsConnect(() => {
      if (me?.id) {
        subConv = wsSubscribe(`/topic/conversations/${me.id}`, (msg) => {
          const data = JSON.parse(msg.body);
          const myId = me.id;
          const otherId = data.participant1Id === myId ? data.participant2Id : data.participant1Id;
          const info = friendMap[otherId];
          setChatRooms(prev => [{
            id: data.id,
            name: info?.name || 'Cuộc trò chuyện',
            unreadCount: 0,
            isOnline: true,
            participants: [myId, otherId],
            avatar: info?.avatar || '',
            lastMessage: '',
            lastMessageTime: new Date()
          } as any, ...prev]);
        });
      }
      if (selectedChatRoom) {
        subMsg = wsSubscribe(`/topic/chat/${selectedChatRoom.id}`, (msg) => {
          const data = JSON.parse(msg.body);
          const myId = me?.id;
          const myName = me?.username || 'Tôi';
          const parsedDate = new Date(data.createdAt);
          const ts = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
          const incoming: Message = {
            id: data.id,
            senderId: data.senderId,
            senderName: data.senderId === myId ? myName : (friendMap[data.senderId]?.name || 'Bạn bè'),
            content: data.content,
            timestamp: ts,
            type: 'text',
            isOwn: data.senderId === myId,
          };
          setMessages(prev => [...prev, incoming]);
          // update room preview
          setChatRooms(prev => prev.map(r => r.id === selectedChatRoom.id ? { ...r, lastMessage: incoming.content, lastMessageTime: incoming.timestamp } : r));
        });
      }
    });
    return () => {
      try { subConv && subConv.unsubscribe && subConv.unsubscribe(); } catch {}
      try { subMsg && subMsg.unsubscribe && subMsg.unsubscribe(); } catch {}
    };
  }, [selectedChatRoom, friendMap]);

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

  // Ensure websocket connection on mount
  useEffect(() => {
    wsConnect();
  }, []);

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
