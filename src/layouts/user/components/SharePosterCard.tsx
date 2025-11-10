import React, { useState } from 'react';
import {
  SharePosterDTO,
  likeShare,
  unlikeShare,
  deleteShare,
  getShareComments,
  createShareComment,
  ShareCommentDTO,
  likeShareComment,
  unlikeShareComment
} from '../../../api/poster/shareApi';
import { getUserId } from '../../../api/util/JwtService';
import './SharePosterCard.css';

interface SharePosterCardProps {
  share: SharePosterDTO;
  onDeleted?: () => void;
  onEdit?: () => void;
  onShareUpdated?: (updatedShare: SharePosterDTO) => void;
}

const SharePosterCard: React.FC<SharePosterCardProps> = ({ share, onDeleted, onEdit, onShareUpdated }) => {
  const currentUserId = getUserId();
  const [isLiked, setIsLiked] = useState(share.isLiked || false);
  const [likeCount, setLikeCount] = useState(share.likeCount);
  const [commentCount, setCommentCount] = useState(share.commentCount);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<ShareCommentDTO[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = currentUserId === share.idUser;

  const handleLike = async () => {
    if (!currentUserId) return;
    
    try {
      if (isLiked) {
        await unlikeShare(share.idShare, currentUserId);
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        await likeShare(share.idShare, { userId: currentUserId });
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  const handleDelete = async () => {
    if (!currentUserId || !window.confirm('Bạn có chắc muốn xóa bài share này?')) return;
    
    try {
      await deleteShare(share.idShare, currentUserId);
      onDeleted?.();
    } catch (err) {
      console.error('Error deleting share:', err);
      alert('Không thể xóa bài share');
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    
    try {
      setLoading(true);
      const data = await getShareComments(share.idShare);
      setComments(data);
      setShowComments(true);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !commentText.trim()) return;
    
    try {
      const newComment = await createShareComment(share.idShare, {
        userId: currentUserId,
        content: commentText.trim()
      });
      setComments(prev => [...prev, newComment]);
      setCommentCount(prev => prev + 1);
      setCommentText('');
    } catch (err) {
      console.error('Error posting comment:', err);
    }
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
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className="share-poster-card">
      {/* Share Header */}
      <div className="share-header">
        <div className="share-author-info">
          <img 
            src={share.userAvatar || '/default-avatar.png'} 
            alt={share.userName}
            className="share-author-avatar"
          />
          <div className="share-author-details">
            <div className="share-author-name">{share.userName}</div>
            <div className="share-timestamp">
              {formatDate(share.createdAt)} • 
              <span className={`privacy-badge privacy-${share.privacyStatusName.toLowerCase()}`}>
                {share.privacyStatusName === 'PUBLIC' ? '🌍 Công khai' :
                 share.privacyStatusName === 'FRIENDS' ? '👥 Bạn bè' :
                 '🔒 Riêng tư'}
              </span>
            </div>
          </div>
        </div>
        
        {isOwner && (
          <div className="share-menu">
            <button className="share-menu-btn" onClick={() => setShowMenu(!showMenu)}>⋮</button>
            {showMenu && (
              <div className="share-menu-dropdown">
                <button onClick={() => { setShowMenu(false); onEdit?.(); }}>✏️ Chỉnh sửa</button>
                <button onClick={() => { setShowMenu(false); handleDelete(); }} className="delete-btn">
                  🗑️ Xóa
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Share Content */}
      {share.content && (
        <div className="share-content">
          {share.content}
        </div>
      )}

      {/* Original Poster (Quoted) */}
      <div className="original-poster-quote">
        <div className="original-poster-header">
          <img 
            src={share.originalPoster.userAvatar || '/default-avatar.png'} 
            alt={share.originalPoster.userName}
            className="original-author-avatar"
          />
          <span className="original-author-name">{share.originalPoster.userName}</span>
        </div>
        
        <div className="original-poster-content">
          {share.originalPoster.content}
        </div>
        
        {share.originalPoster.images && share.originalPoster.images.length > 0 && (
          <div className="original-poster-images">
            {share.originalPoster.images.slice(0, 3).map((img, idx) => (
              <img key={idx} src={img} alt="" className="original-poster-image" />
            ))}
            {share.originalPoster.images.length > 3 && (
              <div className="more-images-overlay">
                +{share.originalPoster.images.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="share-actions">
        <button 
          className={`action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLike}
        >
          {isLiked ? '❤️' : '🤍'} {likeCount > 0 && likeCount}
        </button>
        
        <button 
          className="action-btn"
          onClick={loadComments}
        >
          💬 {commentCount > 0 && commentCount}
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="share-comments-section">
          {loading ? (
            <div className="loading-comments">Đang tải bình luận...</div>
          ) : (
            <>
              {comments.map(comment => (
                <ShareComment 
                  key={comment.idCommentShare} 
                  comment={comment}
                  shareId={share.idShare}
                  onCommentUpdated={(updated) => {
                    setComments(prev => prev.map(c => 
                      c.idCommentShare === updated.idCommentShare ? updated : c
                    ));
                  }}
                  onCommentDeleted={(id) => {
                    setComments(prev => prev.filter(c => c.idCommentShare !== id));
                    setCommentCount(prev => prev - 1);
                  }}
                />
              ))}
              
              {/* Comment Input */}
              <form className="comment-input-form" onSubmit={handleComment}>
                <input
                  type="text"
                  placeholder="Viết bình luận..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="comment-input"
                />
                <button type="submit" className="comment-submit-btn" disabled={!commentText.trim()}>
                  Gửi
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ShareComment Component with Nested Replies
interface ShareCommentProps {
  comment: ShareCommentDTO;
  shareId: string;
  depth?: number;
  onCommentUpdated?: (comment: ShareCommentDTO) => void;
  onCommentDeleted?: (commentId: string) => void;
}

const ShareComment: React.FC<ShareCommentProps> = ({ 
  comment, 
  shareId, 
  depth = 0,
  onCommentUpdated,
  onCommentDeleted 
}) => {
  const currentUserId = getUserId();
  const [isLiked, setIsLiked] = useState(comment.isLiked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState(comment.replies || []);
  
  const isOwner = currentUserId === comment.idUser;
  const maxDepth = 3;

  const handleLikeComment = async () => {
    if (!currentUserId) return;
    
    try {
      if (isLiked) {
        await unlikeShareComment(comment.idCommentShare, currentUserId);
        setLikeCount(prev => prev - 1);
        setIsLiked(false);
      } else {
        await likeShareComment(comment.idCommentShare, { userId: currentUserId });
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }
    } catch (err) {
      console.error('Error toggling comment like:', err);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId || !replyText.trim()) return;
    
    try {
      const { replyToShareComment } = await import('../../../api/poster/shareApi');
      const newReply = await replyToShareComment(comment.idCommentShare, {
        userId: currentUserId,
        content: replyText.trim()
      });
      setReplies(prev => [...prev, newReply]);
      setReplyText('');
      setShowReplyInput(false);
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  const handleDeleteComment = async () => {
    if (!currentUserId || !window.confirm('Xóa bình luận này?')) return;
    
    try {
      const { deleteShareComment } = await import('../../../api/poster/shareApi');
      await deleteShareComment(comment.idCommentShare, currentUserId);
      onCommentDeleted?.(comment.idCommentShare);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  return (
    <div className={`share-comment depth-${depth}`}>
      <img 
        src={comment.userAvatar || '/default-avatar.png'} 
        alt={comment.userName}
        className="comment-avatar"
      />
      <div className="comment-content-wrapper">
        <div className="comment-bubble">
          <div className="comment-author">{comment.userName}</div>
          <div className="comment-text">{comment.content}</div>
        </div>
        
        <div className="comment-actions">
          <button 
            className={`comment-like-btn ${isLiked ? 'liked' : ''}`}
            onClick={handleLikeComment}
          >
            Thích {likeCount > 0 && `(${likeCount})`}
          </button>
          {depth < maxDepth && (
            <button 
              className="comment-reply-btn"
              onClick={() => setShowReplyInput(!showReplyInput)}
            >
              Trả lời
            </button>
          )}
          {isOwner && (
            <button className="comment-delete-btn" onClick={handleDeleteComment}>
              Xóa
            </button>
          )}
        </div>
        
        {/* Reply Input */}
        {showReplyInput && (
          <form className="reply-input-form" onSubmit={handleReply}>
            <input
              type="text"
              placeholder={`Trả lời ${comment.userName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="reply-input"
              autoFocus
            />
            <button type="submit" disabled={!replyText.trim()}>Gửi</button>
          </form>
        )}
        
        {/* Nested Replies */}
        {replies.length > 0 && (
          <div className="comment-replies">
            {replies.map(reply => (
              <ShareComment 
                key={reply.idCommentShare}
                comment={reply}
                shareId={shareId}
                depth={depth + 1}
                onCommentDeleted={(id) => {
                  setReplies(prev => prev.filter(r => r.idCommentShare !== id));
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SharePosterCard;
