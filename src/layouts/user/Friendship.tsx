import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { connect as wsConnect, subscribe as wsSubscribe } from '../../api/websocket/stompClient';
import { ensureConversation } from '../../api/chat/chatApi';
import { 
  searchUserByPhone, 
  validatePhoneNumber, 
  formatPhoneNumber, 
  SearchResult, 
  sendFriendRequest as sendFriendRequestApi,
  acceptFriendRequest as acceptFriendRequestApi,
  rejectFriendRequest as rejectFriendRequestApi,
  getFriendRequestsList,
  getFriendsList,
  unfriend
} from '../../api/user/friendshipApi';
import { getUserInfo } from '../../api/user/loginApi';
import { Users, UserPlus, Search as SearchIcon } from 'lucide-react';
import './Friendship.css';

type TabKey = 'friends' | 'requests' | 'search';

interface Friend {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
  lastSeen?: string;
}

interface FriendRequest {
  id: string; // friendship ID for API calls
  userId: string; // user ID of requester
  username: string;
  firstName: string;
  lastName: string;
  avatar: string;
  requestDate: string;
}

const Friendship: React.FC = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('friends');
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>('');

  const navigationItems: Array<{ key: TabKey; label: string; description: string; icon: React.ElementType; badge?: number }> = [
    {
      key: 'friends',
      label: 'Trang chủ',
      description: 'Tất cả bạn bè và cập nhật gần đây',
      icon: Users,
      badge: friends.length || undefined,
    },
    {
      key: 'requests',
      label: 'Lời mời kết bạn',
      description: 'Xem và quản lý lời mời đang chờ',
      icon: UserPlus,
      badge: friendRequests.length || undefined,
    },
    {
      key: 'search',
      label: 'Tìm bạn bè',
      description: 'Tra cứu bằng số điện thoại',
      icon: SearchIcon,
    },
  ];

  const sectionTitleMap: Record<TabKey, string> = {
    friends: 'Tất cả bạn bè',
    requests: 'Lời mời kết bạn',
    search: 'Tìm kiếm bạn bè',
  };

  const sectionSubtitleMap: Record<TabKey, string> = {
    friends: `${friends.length} người bạn đã kết nối`,
    requests: friendRequests.length
      ? `${friendRequests.length} lời mời đang chờ`
      : 'Không có lời mời mới',
    search: 'Nhập số điện thoại để tìm bạn mới',
  };

  const formatRequestTime = (timestamp: string) => {
    if (!timestamp) return 'Mới đây';
    try {
      return new Date(timestamp).toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Mới đây';
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadFriends(); // Load real friends from API
      await loadFriendRequestsFromApi(); // Load real friend requests
    };
    
    initializeData();
    // connect websocket and subscribe to new conversation notifications
    const currentUserId = getUserInfo()?.id;
    wsConnect(() => {
      if (currentUserId) {
        wsSubscribe(`/topic/conversations/${currentUserId}`, (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            console.log('New conversation notification:', payload);
            // Optionally: update UI or navigate to chat
          } catch (e) { console.error(e); }
        });

        // Subscribe to friend request updates (including unfriend notifications)
        wsSubscribe(`/topic/friend-requests/${currentUserId}`, (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            console.log('Friend request notification:', payload);
            
            // If status is UNFRIENDED, remove from friends list
            if (payload.status === 'UNFRIENDED') {
              setFriends(prev => prev.filter(f => f.id !== payload.userId));
              console.log('Friend removed via WebSocket:', payload.userId);
            } else {
              // Reload friend requests for other status changes
              loadFriendRequestsFromApi();
            }
          } catch (e) { console.error(e); }
        });
      }
    });
  }, []);

  // Load real friends list from API
  const loadFriends = async () => {
    try {
      setIsLoading(true);
      const friendsData = await getFriendsList();
      
      // Transform SearchResult to Friend format for display
      const transformedFriends: Friend[] = friendsData.map(friend => ({
        id: friend.userId || friend.id,
        username: friend.email, // Use email as username
        firstName: friend.firstName,
        lastName: friend.lastName,
        avatar: friend.avatar,
        status: friend.status || 'offline'
      }));
      
      setFriends(transformedFriends);
      console.log('Loaded real friends:', transformedFriends);
    } catch (error) {
      console.error('Failed to load friends:', error);
      setFriends([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  // Load friend requests from API
  const loadFriendRequestsFromApi = async () => {
    try {
      setIsLoading(true);
      const friendRequestsData = await getFriendRequestsList();
      
      // Transform SearchResult to FriendRequest format for display
      const transformedRequests: FriendRequest[] = friendRequestsData.map((request, index) => ({
        id: request.id, // 🎉 Real friendship ID from API!
        userId: request.userId || request.id,
        username: request.email, // Use email as username
        firstName: request.firstName,
        lastName: request.lastName,
        avatar: request.avatar,
        requestDate: new Date().toISOString() // Default to now
      }));
      
      setFriendRequests(transformedRequests);
      console.log('Loaded friend requests:', transformedRequests);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
      setFriendRequests([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSearchError('');
    
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    // Validate phone number format
    if (!validatePhoneNumber(query.trim())) {
      setSearchError('Vui lòng nhập số điện thoại hợp lệ (VD: 0787792236)');
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await searchUserByPhone(query.trim());
      
      if (result) {
        setSearchResults([result]);
        setSearchError('');
      } else {
        setSearchResults([]);
        setSearchError('Không tìm thấy người dùng với số điện thoại này');
      }
    } catch (error: any) {
      console.error('Search error:', error);
      setSearchResults([]);
      setSearchError('Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (userId: string) => {
    try {
      console.log('Gửi lời mời kết bạn đến:', userId);
      const success = await sendFriendRequestApi(userId);
      if (success) {
        alert('Đã gửi lời mời kết bạn thành công!');
      } else {
        alert('Không thể gửi lời mời kết bạn. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Có lỗi xảy ra khi gửi lời mời kết bạn.');
    }
  };

  const acceptFriendRequest = async (friendshipId: string) => {
    try {
      console.log('Chấp nhận lời mời kết bạn:', friendshipId);
      const success = await acceptFriendRequestApi(friendshipId);
      if (success) {
        // Remove from requests list
        setFriendRequests(prev => prev.filter(req => req.id !== friendshipId));
        alert('Đã chấp nhận lời mời kết bạn!');
        // Ensure conversation exists between me and the requester
        const me = getUserInfo();
        const request = friendRequests.find(r => r.id === friendshipId);
        if (me?.id && request?.userId) {
          try {
            const conversationId = await ensureConversation(me.id, request.userId);
            console.log('Conversation ensured:', conversationId);
            // Điều hướng sang trang chat để thấy room ngay
            navigate('/chat');
          } catch (e) { console.error('Ensure conversation failed', e); }
        }
      } else {
        alert('Không thể chấp nhận lời mời kết bạn. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Có lỗi xảy ra khi chấp nhận lời mời kết bạn.');
    }
  };

  const rejectFriendRequest = async (friendshipId: string) => {
    try {
      console.log('Từ chối lời mời kết bạn:', friendshipId);
      const success = await rejectFriendRequestApi(friendshipId);
      if (success) {
        // Remove from requests list
        setFriendRequests(prev => prev.filter(req => req.id !== friendshipId));
        alert('Đã từ chối lời mời kết bạn.');
      } else {
        alert('Không thể từ chối lời mời kết bạn. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      alert('Có lỗi xảy ra khi từ chối lời mời kết bạn.');
    }
  };

  const removeFriend = async (friendId: string) => {
    const friend = friends.find(f => f.id === friendId);
    const friendName = friend ? `${friend.firstName} ${friend.lastName}` : 'bạn bè này';
    
    if (!window.confirm(`Bạn có chắc muốn hủy kết bạn với ${friendName}?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await unfriend(friendId);
      
      // Remove from local state
      setFriends(prev => prev.filter(friend => friend.id !== friendId));
      
      alert('Đã hủy kết bạn thành công!');
    } catch (error: any) {
      console.error('Unfriend error:', error);
      alert(error.message || 'Không thể hủy kết bạn. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
  };

  const messageFriend = async (friendId: string) => {
    try {
      const me = getUserInfo();
      if (!me?.id) return alert('Vui lòng đăng nhập lại');
      await ensureConversation(me.id, friendId);
      navigate('/chat');
    } catch (e) {
      console.error('Mở chat thất bại', e);
      alert('Không thể mở chat, vui lòng thử lại.');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Đang hoạt động';
      case 'busy': return 'Bận';
      case 'offline': return 'Không hoạt động';
      default: return 'Không xác định';
    }
  };

  return (
    <div className="friends-page">
      <div className="friends-page__container">
        <aside className="friends-sidebar">
          <div className="friends-sidebar__header">
            <h1>Bạn bè</h1>
            <p>Quản lý kết nối và khám phá bạn mới</p>
          </div>
          <nav className="friends-sidebar__nav" aria-label="Danh mục bạn bè">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`friends-sidebar__item${activeTab === item.key ? ' active' : ''}`}
                  onClick={() => setActiveTab(item.key)}
                >
                  <span className="friends-sidebar__item-icon">
                    <Icon size={20} strokeWidth={1.6} />
                  </span>
                  <span className="friends-sidebar__item-text">
                    <span className="friends-sidebar__item-label">{item.label}</span>
                    <span className="friends-sidebar__item-description">{item.description}</span>
                  </span>
                  {item.badge ? (
                    <span className="friends-sidebar__item-badge">{item.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
          <div className="friends-sidebar__note">
            <p>Giữ liên lạc với bạn bè và kiểm soát lời mời kết bạn ở một nơi.</p>
          </div>
        </aside>

        <main className="friends-main">
          <header className="friends-main__header">
            <div>
              <h2>{sectionTitleMap[activeTab]}</h2>
              <p>{sectionSubtitleMap[activeTab]}</p>
            </div>
            {activeTab === 'friends' && (
              <button
                type="button"
                className="friends-button friends-button--surface"
                onClick={() => setActiveTab('search')}
              >
                <SearchIcon size={16} strokeWidth={1.6} />
                <span>Tìm bạn bè</span>
              </button>
            )}
          </header>

          {activeTab === 'friends' && (
            <section className="friends-section" aria-label="Danh sách bạn bè">
              {friends.length === 0 ? (
                <div className="friends-empty">
                  <p>Chưa có kết nối nào. Hãy tìm và thêm bạn bè mới.</p>
                  <button
                    type="button"
                    className="friends-button friends-button--primary"
                    onClick={() => setActiveTab('search')}
                  >
                    Tìm bạn bè mới
                  </button>
                </div>
              ) : (
                <div className="friends-grid">
                  {friends.map(friend => (
                    <article key={friend.id} className="friend-card">
                      <div className="friend-card__avatar" aria-hidden="true">
                        {friend.avatar ? (
                          <img src={friend.avatar} alt={friend.username} />
                        ) : (
                          <span>
                            {(friend.firstName?.charAt(0) || '').toUpperCase()}
                            {(friend.lastName?.charAt(0) || '').toUpperCase()}
                          </span>
                        )}
                        <span className={`status-dot status-dot--${friend.status}`} />
                      </div>
                      <div className="friend-card__body">
                        <h3>{`${friend.firstName} ${friend.lastName}`.trim()}</h3>
                        <span className="friend-card__username">{friend.username}</span>
                        <span className="friend-card__status">
                          {getStatusText(friend.status)}
                          {friend.lastSeen ? ` · ${friend.lastSeen}` : ''}
                        </span>
                      </div>
                      <div className="friend-card__actions">
                        <button
                          type="button"
                          className="friends-button friends-button--surface"
                          onClick={() => messageFriend(friend.id)}
                        >
                          Nhắn tin
                        </button>
                        <button
                          type="button"
                          className="friends-button friends-button--danger"
                          onClick={() => removeFriend(friend.id)}
                        >
                          Hủy kết bạn
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'requests' && (
            <section className="friends-section" aria-label="Lời mời kết bạn">
              {friendRequests.length === 0 ? (
                <div className="friends-empty">
                  <p>Không có lời mời kết bạn nào ngay lúc này.</p>
                </div>
              ) : (
                <div className="requests-grid">
                  {friendRequests.map(request => (
                    <article key={request.id} className="request-card">
                      <div className="request-card__avatar" aria-hidden="true">
                        {request.avatar ? (
                          <img src={request.avatar} alt={request.username} />
                        ) : (
                          <span>
                            {(request.firstName?.charAt(0) || '').toUpperCase()}
                            {(request.lastName?.charAt(0) || '').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="request-card__body">
                        <h3>{`${request.firstName} ${request.lastName}`.trim()}</h3>
                        <span className="request-card__username">{request.username}</span>
                        <span className="request-card__date">Gửi {formatRequestTime(request.requestDate)}</span>
                      </div>
                      <div className="request-card__actions">
                        <button
                          type="button"
                          className="friends-button friends-button--primary"
                          onClick={() => acceptFriendRequest(request.id)}
                        >
                          Chấp nhận
                        </button>
                        <button
                          type="button"
                          className="friends-button friends-button--surface"
                          onClick={() => rejectFriendRequest(request.id)}
                        >
                          Từ chối
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'search' && (
            <section className="friends-section friends-section--search" aria-label="Tìm kiếm bạn bè">
              <div className="search-panel">
                <div className="search-panel__field">
                  <label htmlFor="friend-search" className="search-panel__label">Tìm kiếm bằng số điện thoại</label>
                  <div className="search-panel__input">
                    <SearchIcon size={18} strokeWidth={1.6} />
                    <input
                      id="friend-search"
                      type="text"
                      placeholder="Nhập số điện thoại (VD: 0787792236)"
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {searchError && (
                <div className="friends-alert friends-alert--error">{searchError}</div>
              )}

              {isLoading && <div className="friends-loading">Đang tìm kiếm...</div>}

              {!isLoading && searchQuery && (
                <div className="search-results">
                  <h4>Kết quả tìm kiếm ({searchResults.length})</h4>
                  {searchResults.length === 0 ? (
                    <div className="friends-empty">
                      <p>Không tìm thấy kết quả phù hợp.</p>
                    </div>
                  ) : (
                    <div className="results-grid">
                      {searchResults.map(user => (
                        <article key={user.id} className="result-card">
                          <div className="result-card__avatar" aria-hidden="true">
                            {user.avatar ? (
                              <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                            ) : (
                              <span>
                                {(user.firstName?.charAt(0) || '').toUpperCase()}
                                {(user.lastName?.charAt(0) || '').toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="result-card__body">
                            <h3>{`${user.firstName} ${user.lastName}`.trim()}</h3>
                            <span className="result-card__meta">{formatPhoneNumber(user.phoneNumber)}</span>
                            <span className="result-card__details">{user.age} tuổi · {user.gender}</span>
                          </div>
                          <div className="result-card__actions">
                            <button
                              type="button"
                              className="friends-button friends-button--primary"
                              onClick={() => sendFriendRequest(user.userId || user.id)}
                              disabled={!user.userId}
                              title={!user.userId ? 'Không thể kết bạn: Thiếu thông tin user ID' : 'Gửi lời mời kết bạn'}
                            >
                              {!user.userId ? 'Không có ID' : 'Kết bạn'}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {!searchQuery && !isLoading && !searchError && (
                <div className="friends-hint">
                  <p>Nhập số điện thoại để tìm kiếm bạn bè mới và gửi lời mời kết bạn.</p>
                  <span>Ví dụ: 0787792236 hoặc +84787792236</span>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default Friendship;
