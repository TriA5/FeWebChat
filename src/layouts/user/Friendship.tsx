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
import './Friendship.css';

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
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string>('');

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
    <div className="friendship-container">
      <div className="friendship-header">
        <h1>Bạn Bè</h1>
        <p>Quản lý danh sách bạn bè và kết nối mới</p>
      </div>

      <div className="friendship-tabs">
        <button 
          className={activeTab === 'friends' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('friends')}
        >
          Bạn Bè ({friends.length})
        </button>
        <button 
          className={activeTab === 'requests' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('requests')}
        >
          Lời Mời ({friendRequests.length})
        </button>
        <button 
          className={activeTab === 'search' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('search')}
        >
          Tìm Kiếm
        </button>
      </div>

      <div className="friendship-content">
        {activeTab === 'friends' && (
          <div className="friends-list">
            <h3>Danh Sách Bạn Bè</h3>
            {friends.length === 0 ? (
              <div className="empty-state">
                <p>Bạn chưa có bạn bè nào</p>
              </div>
            ) : (
              <div className="friends-grid">
                {friends.map(friend => (
                  <div key={friend.id} className="friend-card">
                    <div className="friend-avatar">
                      {friend.avatar ? (
                        <img src={friend.avatar} alt={friend.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {`${friend.firstName.charAt(0)}${friend.lastName.charAt(0)}`}
                        </div>
                      )}
                      <div 
                        className={`status-indicator status-${friend.status}`}
                      ></div>
                    </div>
                    <div className="friend-info">
                      <h4>{`${friend.firstName} ${friend.lastName}`}</h4>
                      <p className="username">@{friend.username}</p>
                      <p className="status">
                        {getStatusText(friend.status)}
                        {friend.lastSeen && ` - ${friend.lastSeen}`}
                      </p>
                    </div>
                    <div className="friend-actions">
                      <button className="btn-message" onClick={() => messageFriend(friend.id)}>Nhắn tin</button>
                      <button 
                        className="btn-remove"
                        onClick={() => removeFriend(friend.id)}
                      >
                        Xóa bạn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="friend-requests">
            <h3>Lời Mời Kết Bạn</h3>
            {friendRequests.length === 0 ? (
              <div className="empty-state">
                <p>Không có lời mời kết bạn nào</p>
              </div>
            ) : (
              <div className="requests-list">
                {friendRequests.map(request => (
                  <div key={request.id} className="request-card">
                    <div className="request-avatar">
                      {request.avatar ? (
                        <img src={request.avatar} alt={request.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {`${request.firstName.charAt(0)}${request.lastName.charAt(0)}`}
                        </div>
                      )}
                    </div>
                    <div className="request-info">
                      <h4>{`${request.firstName} ${request.lastName}`}</h4>
                      <p className="username">@{request.username}</p>
                      <p className="request-date">Gửi lời mời {request.requestDate}</p>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="btn-accept"
                        onClick={() => acceptFriendRequest(request.id)}
                      >
                        Chấp nhận
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => rejectFriendRequest(request.id)}
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="friend-search">
            <h3>Tìm Kiếm Bạn Bè</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Nhập số điện thoại để tìm kiếm (VD: 0787792236)"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
              {/* <div className="search-icon">🔍</div> */}
            </div>

            {searchError && (
              <div className="search-error">
                <p>{searchError}</p>
              </div>
            )}

            {isLoading && (
              <div className="loading">
                <p>Đang tìm kiếm...</p>
              </div>
            )}

            {!isLoading && searchQuery && (
              <div className="search-results">
                <h4>Kết quả tìm kiếm ({searchResults.length})</h4>
                {searchResults.length === 0 ? (
                  <div className="empty-state">
                    <p>Không tìm thấy kết quả phù hợp</p>
                  </div>
                ) : (
                  <div className="results-list">
                    {searchResults.map(user => (
                      <div key={user.id} className="result-card">
                        <div className="result-avatar">
                          {user.avatar ? (
                            <img src={user.avatar} alt={`${user.firstName} ${user.lastName}`} />
                          ) : (
                            <div className="avatar-placeholder">
                              {`${user.firstName.charAt(0)}${user.lastName.charAt(0)}`}
                            </div>
                          )}
                        </div>
                        <div className="result-info">
                          <h4>{`${user.firstName} ${user.lastName}`}</h4>
                          <p className="username">{formatPhoneNumber(user.phoneNumber)}</p>
                          <p className="user-details">{user.age} tuổi • {user.gender}</p>
                        </div>
                        <div className="result-actions">
                          <button 
                            className="btn-add-friend"
                            onClick={() => sendFriendRequest(user.userId || user.id)}
                            disabled={!user.userId}
                            title={!user.userId ? 'Không thể kết bạn: Thiếu thông tin user ID' : 'Gửi lời mời kết bạn'}
                          >
                            {!user.userId ? 'Không có ID' : 'Kết bạn'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!searchQuery && !isLoading && !searchError && (
              <div className="search-help">
                <p>� Nhập số điện thoại để tìm kiếm bạn bè mới</p>
                <p className="search-example">Ví dụ: 0787792236 hoặc +84787792236</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friendship;
