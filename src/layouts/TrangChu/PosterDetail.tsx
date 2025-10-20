import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPosterById, deletePoster, PosterDTO } from '../../api/poster/posterApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import ImageViewer from '../../components/ImageViewer';
import './PosterDetail.css';

const PosterDetail: React.FC = () => {
  const { posterId } = useParams<{ posterId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();
  
  const [poster, setPoster] = useState<PosterDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Image Viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImages, setViewerImages] = useState<string[]>([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Fake data for future development (reactions, comments, shares)
  const [reactions, setReactions] = useState({
    like: 245,
    love: 89,
    haha: 34,
    wow: 12,
    sad: 5,
    angry: 2
  });
  const [totalReactions, setTotalReactions] = useState(387);
  const [totalComments, setTotalComments] = useState(56);
  const [totalShares, setTotalShares] = useState(23);
  const [userReaction, setUserReaction] = useState<string | null>(null); // null, 'like', 'love', etc.

  // Fake comments data
  const [comments, setComments] = useState([
    {
      id: '1',
      userName: 'Nguyễn Văn A',
      userAvatar: 'https://i.pravatar.cc/150?img=1',
      content: 'Bài viết rất hay và bổ ích! Cảm ơn bạn đã chia sẻ 👍',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      likes: 12
    },
    {
      id: '2',
      userName: 'Trần Thị B',
      userAvatar: 'https://i.pravatar.cc/150?img=2',
      content: 'Mình cũng nghĩ vậy. Rất đồng ý với quan điểm này.',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      likes: 8
    },
    {
      id: '3',
      userName: 'Lê Minh C',
      userAvatar: 'https://i.pravatar.cc/150?img=3',
      content: 'Có thể giải thích rõ hơn về phần này được không? 🤔',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      likes: 3
    }
  ]);

  const loadPoster = useCallback(async () => {
    if (!posterId) {
      setError('ID poster không hợp lệ');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPosterById(posterId);
      setPoster(data);
    } catch (err: any) {
      console.error('Error loading poster:', err);
      setError(err.response?.data?.message || 'Không thể tải poster');
    } finally {
      setLoading(false);
    }
  }, [posterId]);

  useEffect(() => {
    loadPoster();
  }, [loadPoster]);

  const handleDelete = async () => {
    if (!poster || !currentUser) return;
    
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) {
      return;
    }

    try {
      setDeleting(true);
      await deletePoster(poster.idPoster, currentUser.id);
      alert('Đã xóa bài đăng thành công!');
      navigate('/home');
    } catch (err: any) {
      console.error('Error deleting poster:', err);
      alert(err.response?.data?.message || 'Không thể xóa bài đăng');
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    navigate(`/poster/${posterId}/edit`);
  };

  // Fake handlers for future development
  const handleReaction = (reactionType: string) => {
    if (userReaction === reactionType) {
      // Remove reaction
      setUserReaction(null);
      setTotalReactions(prev => prev - 1);
      setReactions(prev => ({
        ...prev,
        [reactionType]: prev[reactionType as keyof typeof prev] - 1
      }));
    } else {
      // Add or change reaction
      if (userReaction) {
        // Change reaction
        setReactions(prev => ({
          ...prev,
          [userReaction]: prev[userReaction as keyof typeof prev] - 1,
          [reactionType]: prev[reactionType as keyof typeof prev] + 1
        }));
      } else {
        // New reaction
        setTotalReactions(prev => prev + 1);
        setReactions(prev => ({
          ...prev,
          [reactionType]: prev[reactionType as keyof typeof prev] + 1
        }));
      }
      setUserReaction(reactionType);
    }
  };

  const handleComment = (content: string) => {
    if (!content.trim() || !currentUser) return;

    const newComment = {
      id: Date.now().toString(),
      userName: `${currentUser.lastName} ${currentUser.firstName}`,
      userAvatar: currentUser.avatar || 'https://i.pravatar.cc/150?img=99',
      content: content.trim(),
      timestamp: new Date().toISOString(),
      likes: 0
    };

    setComments(prev => [newComment, ...prev]);
    setTotalComments(prev => prev + 1);
  };

  const handleShare = () => {
    // Fake share functionality
    setTotalShares(prev => prev + 1);
    alert('Đã chia sẻ bài viết! (Chức năng demo)');
  };

  const openImageViewer = (images: string[], index: number) => {
    setViewerImages(images);
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const closeImageViewer = () => {
    setViewerOpen(false);
  };

  const nextImage = () => {
    setViewerIndex((prev) => (prev + 1) % viewerImages.length);
  };

  const prevImage = () => {
    setViewerIndex((prev) => (prev - 1 + viewerImages.length) % viewerImages.length);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPrivacyIcon = (privacyStatus: string) => {
    switch (privacyStatus) {
      case 'PUBLIC': return '🌍';
      case 'FRIENDS': return '👥';
      case 'PRIVATE': return '🔒';
      default: return '🌍';
    }
  };

  const getPrivacyText = (privacyStatus: string) => {
    switch (privacyStatus) {
      case 'PUBLIC': return 'Công khai';
      case 'FRIENDS': return 'Bạn bè';
      case 'PRIVATE': return 'Riêng tư';
      default: return 'Công khai';
    }
  };

  const getFullName = (poster: PosterDTO): string => {
    if (poster.userFirstName && poster.userLastName) {
      return `${poster.userFirstName} ${poster.userLastName}`;
    }
    return poster.userName || 'Người dùng';
  };

  if (loading) {
    return (
      <div className="poster-detail-container">
        <div className="poster-detail-loading">
          <div className="spinner"></div>
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !poster) {
    return (
      <div className="poster-detail-container">
        <div className="poster-detail-error">
          <h2>❌ Lỗi</h2>
          <p>{error || 'Không tìm thấy bài đăng'}</p>
          <button onClick={() => navigate('/home')} className="btn-back">
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const isOwner = currentUser && currentUser.id === poster.idUser;

  return (
    <div className="poster-detail-container">
      <div className="poster-detail-wrapper">
        <div className="poster-detail-header">
          <button onClick={() => navigate(-1)} className="btn-back-icon">
            ← Quay lại
          </button>
          <h1>Chi tiết bài đăng</h1>
        </div>

        <article className="poster-detail-card">
          <header className="poster-detail-card__header">
            <div className="poster-detail-card__author">
              <img
                src={poster.userAvatar || '/default-avatar.png'}
                alt={getFullName(poster)}
                className="poster-detail-card__avatar"
              />
              <div className="poster-detail-card__author-info">
                <h3 className="poster-detail-card__author-name">{getFullName(poster)}</h3>
                <div className="poster-detail-card__meta">
                  <time className="poster-detail-card__time">
                    {formatDate(poster.createdAt)}
                  </time>
                  <span className="poster-detail-card__privacy">
                    {getPrivacyIcon(poster.privacyStatusName)} {getPrivacyText(poster.privacyStatusName)}
                  </span>
                </div>
              </div>
            </div>
            
            {isOwner && (
              <div className="poster-detail-card__actions">
                <button 
                  onClick={handleEdit} 
                  className="btn-action btn-edit"
                  title="Chỉnh sửa"
                >
                  ✏️
                </button>
                <button 
                  onClick={handleDelete} 
                  className="btn-action btn-delete"
                  disabled={deleting}
                  title="Xóa"
                >
                  {deleting ? '⏳' : '🗑️'}
                </button>
              </div>
            )}
          </header>

          <div className="poster-detail-card__content">
            <p>{poster.content}</p>
          </div>

          {poster.imageUrls && poster.imageUrls.length > 0 && (
            <div className="poster-detail-card__images">
              {poster.imageUrls.length === 1 ? (
                <img
                  src={poster.imageUrls[0]}
                  alt="Ảnh bài đăng"
                  className="poster-detail-card__image-single"
                  onClick={() => openImageViewer(poster.imageUrls!, 0)}
                />
              ) : (
                <div className={`poster-detail-card__image-grid ${
                  poster.imageUrls.length === 2 ? 'grid-two' :
                  poster.imageUrls.length === 3 ? 'grid-three' :
                  'grid-four-plus'
                }`}>
                  {poster.imageUrls.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Ảnh ${idx + 1}`}
                      className="poster-detail-card__image-grid-item"
                      onClick={() => openImageViewer(poster.imageUrls!, idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Section */}
          <div className="poster-detail-card__stats-bar">
            <div className="stats-left">
              <div className="reaction-icons">
                <span className="reaction-icon">👍</span>
                <span className="reaction-icon">❤️</span>
                <span className="reaction-icon">😂</span>
              </div>
              <span className="stats-count">{totalReactions.toLocaleString('vi-VN')}</span>
            </div>
            <div className="stats-right">
              <span className="stats-item">{totalComments} bình luận</span>
              <span className="stats-item">{totalShares} lượt chia sẻ</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="poster-detail-card__actions-bar">
            <button 
              className={`action-btn ${userReaction === 'like' ? 'active' : ''}`}
              onClick={() => handleReaction('like')}
            >
              👍 Thích
            </button>
            <button className="action-btn">
              💬 Bình luận
            </button>
            <button className="action-btn" onClick={handleShare}>
              ↗️ Chia sẻ
            </button>
          </div>

          {/* Comments Section */}
          <div className="poster-detail-card__comments">
            <h3 className="comments-title">Bình luận ({totalComments})</h3>
            
            {/* Comment Input */}
            {currentUser && (
              <div className="comment-input-container">
                <img
                  src={currentUser.avatar || '/default-avatar.png'}
                  alt={currentUser.username}
                  className="comment-avatar"
                />
                <div className="comment-input-wrapper">
                  <input
                    type="text"
                    placeholder="Viết bình luận..."
                    className="comment-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleComment(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Comments List */}
            <div className="comments-list">
              {comments.map((comment) => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-author-section">
                    <img
                      src={comment.userAvatar}
                      alt={comment.userName}
                      className="comment-avatar"
                    />
                    <h4 className="comment-author-name">{comment.userName}</h4>
                  </div>
                  <div className="comment-content">
                    <div className="comment-bubble">
                      <p className="comment-text">{comment.content}</p>
                    </div>
                    <div className="comment-meta">
                      <span className="comment-action">Thích</span>
                      <span className="comment-action">Trả lời</span>
                      <span className="comment-time">{formatDate(comment.timestamp)}</span>
                      {comment.likes > 0 && (
                        <span className="comment-likes">👍 {comment.likes}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <footer className="poster-detail-card__footer">
            <div className="poster-detail-card__stats">
              <span>📅 Đăng lúc: {new Date(poster.createdAt).toLocaleString('vi-VN')}</span>
              {poster.updatedAt !== poster.createdAt && (
                <span>✏️ Cập nhật: {new Date(poster.updatedAt).toLocaleString('vi-VN')}</span>
              )}
            </div>
          </footer>
        </article>
      </div>

      {viewerOpen && (
        <ImageViewer
          images={viewerImages}
          currentIndex={viewerIndex}
          onClose={closeImageViewer}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </div>
  );
};

export default PosterDetail;
