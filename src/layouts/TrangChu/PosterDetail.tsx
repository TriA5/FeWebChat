import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPosterById, deletePoster, PosterDTO } from '../../api/poster/posterApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import ImageViewer from '../../components/ImageViewer';
import { likePoster, unlikePoster, getTotalLikes, checkUserLikedPoster, setUserLikedPoster } from '../../api/poster/likeApi';
import { getCommentsByPosterId, formatCommentTime, countTotalComments, createComment, replyToComment, updateComment, deleteComment, type Comment } from '../../api/poster/commentApi';
import { getUserById } from '../../api/user/userApi';
import './PosterDetail.css';
import './Home.css'; // Import để sử dụng comment styles

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

  // Like state
  const [likeCount, setLikeCount] = useState(0);
  const [userLiked, setUserLiked] = useState(false);
  const [likingInProgress, setLikingInProgress] = useState(false);
  
  // Comment state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // commentId
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({}); // commentId -> content
  const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({}); // commentId -> loading
  
  // Edit state
  const [editingComment, setEditingComment] = useState<string | null>(null); // commentId
  const [editInputs, setEditInputs] = useState<Record<string, string>>({}); // commentId -> content
  const [submittingEdit, setSubmittingEdit] = useState<Record<string, boolean>>({}); // commentId -> loading
  
  // Nested replies expand/collapse state
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({}); // commentId -> expanded
  
  const currentUserRef = useRef<any>(currentUser);

  // Update currentUserRef when currentUser changes
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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
      
      // Load likes
      if (currentUser?.id) {
        const count = await getTotalLikes(posterId);
        setLikeCount(count);
        
        const liked = checkUserLikedPoster(posterId, currentUser.id);
        setUserLiked(liked);
      }
      
      // Load comments
      setLoadingComments(true);
      const postComments = await getCommentsByPosterId(posterId);
      const enrichedComments = await enrichCommentsWithUserData(postComments);
      setComments(enrichedComments);
      setCommentCount(countTotalComments(postComments));
      setLoadingComments(false);
      
    } catch (err: any) {
      console.error('Error loading poster:', err);
      setError(err.response?.data?.message || 'Poster Không tồn tại');
    } finally {
      setLoading(false);
    }
  }, [posterId, currentUser]);

  useEffect(() => {
    loadPoster();
  }, [loadPoster]);
  
  // Enrich comments with user data
  const enrichCommentsWithUserData = async (commentList: Comment[]): Promise<Comment[]> => {
    const userCache: Record<string, any> = {};
    
    const enrichComment = async (comment: Comment): Promise<Comment> => {
      // Fetch user data if not cached
      if (!userCache[comment.idUser]) {
        try {
          const userData = await getUserById(comment.idUser);
          userCache[comment.idUser] = userData;
        } catch (error) {
          console.error(`Error fetching user ${comment.idUser}:`, error);
          userCache[comment.idUser] = null;
        }
      }
      
      const user = userCache[comment.idUser];
      const enrichedComment = {
        ...comment,
        userName: user?.username || 'Người dùng',
        userAvatar: user?.avatar || '',
        userFirstName: user?.firstName || '',
        userLastName: user?.lastName || ''
      };
      
      // Recursively enrich replies
      if (comment.replies && comment.replies.length > 0) {
        enrichedComment.replies = await Promise.all(
          comment.replies.map(reply => enrichComment(reply))
        );
      }
      
      return enrichedComment;
    };
    
    return Promise.all(commentList.map(enrichComment));
  };

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

  // Like/Unlike handler
  const handleLikeToggle = async () => {
    if (!posterId || !currentUser?.id) {
      alert('Vui lòng đăng nhập để thích bài viết');
      return;
    }

    if (likingInProgress) {
      return;
    }

    const isCurrentlyLiked = userLiked;
    const currentCount = likeCount;

    // Optimistic update
    setUserLiked(!isCurrentlyLiked);
    setLikeCount(isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1);
    setLikingInProgress(true);

    try {
      let success = false;
      if (isCurrentlyLiked) {
        success = await unlikePoster(posterId, currentUser.id);
        if (success) {
          setUserLikedPoster(posterId, currentUser.id, false);
        }
      } else {
        success = await likePoster(posterId, currentUser.id);
        if (success) {
          setUserLikedPoster(posterId, currentUser.id, true);
        }
      }

      if (!success) {
        // Revert on failure
        setUserLiked(isCurrentlyLiked);
        setLikeCount(currentCount);
      } else {
        // Fetch updated count from server
        const newCount = await getTotalLikes(posterId);
        setLikeCount(newCount);
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);
      setUserLiked(isCurrentlyLiked);
      setLikeCount(currentCount);
    } finally {
      setLikingInProgress(false);
    }
  };

  // Submit comment handler
  const handleSubmitComment = async () => {
    if (!posterId || !currentUser?.id) {
      alert('Vui lòng đăng nhập để bình luận');
      return;
    }

    const content = commentInput.trim();
    if (!content) {
      return;
    }

    setSubmittingComment(true);

    try {
      const newComment = await createComment(posterId, currentUser.id, content);
      
      if (newComment) {
        const userData = await getUserById(currentUser.id);
        
        const enrichedComment: Comment = {
          ...newComment,
          userName: userData?.username || currentUser.username || 'Người dùng',
          userAvatar: userData?.avatar || currentUser.avatar || '',
          userFirstName: userData?.firstName || currentUser.firstName || '',
          userLastName: userData?.lastName || currentUser.lastName || '',
          replies: [],
          replyCount: 0
        };

        setComments(prev => [enrichedComment, ...prev]);
        setCommentCount(prev => prev + 1);
        setCommentInput('');
        
        console.log('✅ Comment added successfully');
      } else {
        alert('Không thể thêm bình luận. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('❌ Error submitting comment:', error);
      alert('Có lỗi xảy ra khi thêm bình luận.');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Toggle reply input for a comment
  const handleToggleReply = (commentId: string) => {
    setReplyingTo(prev => prev === commentId ? null : commentId);
  };

  // Submit reply to a comment
  const handleSubmitReply = async (parentCommentId: string) => {
    if (!posterId || !currentUser?.id) {
      alert('Vui lòng đăng nhập để trả lời bình luận');
      return;
    }

    const content = replyInputs[parentCommentId]?.trim();
    if (!content) {
      return;
    }

    setSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));

    try {
      const newReply = await replyToComment(posterId, parentCommentId, currentUser.id, content);
      
      if (newReply) {
        const userData = await getUserById(currentUser.id);
        
        const enrichedReply: Comment = {
          ...newReply,
          userName: userData?.username || currentUser.username || 'Người dùng',
          userAvatar: userData?.avatar || currentUser.avatar || '',
          userFirstName: userData?.firstName || currentUser.firstName || '',
          userLastName: userData?.lastName || currentUser.lastName || '',
          replies: [],
          replyCount: 0
        };

        setComments(prev => {
          const updateCommentReplies = (commentsList: Comment[]): Comment[] => {
            return commentsList.map(comment => {
              if (comment.idComment === parentCommentId) {
                return {
                  ...comment,
                  replies: [enrichedReply, ...(comment.replies || [])],
                  replyCount: (comment.replyCount || 0) + 1
                };
              } else if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentReplies(comment.replies)
                };
              }
              return comment;
            });
          };

          return updateCommentReplies(prev);
        });

        setCommentCount(prev => prev + 1);
        setReplyInputs(prev => {
          const newState = { ...prev };
          delete newState[parentCommentId];
          return newState;
        });
        setReplyingTo(null);

        console.log('✅ Reply added successfully');
      } else {
        alert('Không thể thêm phản hồi. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('❌ Error submitting reply:', error);
      alert('Có lỗi xảy ra khi thêm phản hồi.');
    } finally {
      setSubmittingReply(prev => ({ ...prev, [parentCommentId]: false }));
    }
  };

  // Toggle nested replies expand/collapse
  const handleToggleNestedReplies = (commentId: string) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  // Toggle edit mode for a comment
  const handleToggleEdit = (commentId: string, currentContent: string) => {
    setEditingComment(prev => {
      if (prev === commentId) {
        return null;
      } else {
        setEditInputs(prevInputs => ({ ...prevInputs, [commentId]: currentContent }));
        return commentId;
      }
    });
  };

  // Submit edited comment
  const handleSubmitEdit = async (commentId: string) => {
    if (!posterId || !currentUser?.id) {
      alert('Vui lòng đăng nhập để sửa bình luận');
      return;
    }

    const content = editInputs[commentId]?.trim();
    if (!content) {
      return;
    }

    setSubmittingEdit(prev => ({ ...prev, [commentId]: true }));

    try {
      const updatedComment = await updateComment(posterId, commentId, currentUser.id, content);
      
      if (updatedComment) {
        setComments(prev => {
          const updateCommentContent = (commentsList: Comment[]): Comment[] => {
            return commentsList.map(comment => {
              if (comment.idComment === commentId) {
                return {
                  ...comment,
                  content: updatedComment.content,
                  updatedAt: updatedComment.updatedAt
                };
              } else if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentContent(comment.replies)
                };
              }
              return comment;
            });
          };

          return updateCommentContent(prev);
        });

        setEditInputs(prev => {
          const newState = { ...prev };
          delete newState[commentId];
          return newState;
        });
        setEditingComment(null);

        console.log('✅ Comment updated successfully');
      } else {
        alert('Không thể cập nhật bình luận. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('❌ Error updating comment:', error);
      alert('Có lỗi xảy ra khi cập nhật bình luận.');
    } finally {
      setSubmittingEdit(prev => ({ ...prev, [commentId]: false }));
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId: string) => {
    if (!posterId || !currentUser?.id) {
      alert('Vui lòng đăng nhập để xóa bình luận');
      return;
    }

    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
      return;
    }

    try {
      const success = await deleteComment(posterId, commentId, currentUser.id);
      
      if (success) {
        setComments(prev => {
          const removeComment = (commentsList: Comment[]): Comment[] => {
            return commentsList.filter(comment => {
              if (comment.idComment === commentId) {
                return false;
              } else if (comment.replies && comment.replies.length > 0) {
                comment.replies = removeComment(comment.replies);
              }
              return true;
            });
          };

          return removeComment(prev);
        });

        setCommentCount(prev => Math.max(0, prev - 1));

        console.log('✅ Comment deleted successfully');
      } else {
        alert('Không thể xóa bình luận. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      alert('Có lỗi xảy ra khi xóa bình luận.');
    }
  };

  // Render nested replies recursively
  const renderReply = (reply: Comment, postId: string, depth: number = 1) => {
    const hasNestedReplies = reply.replies && reply.replies.length > 0;
    const isExpanded = expandedReplies[reply.idComment];
    const maxDepth = 3; // Limit nesting depth for UI
    
    const name = reply.userFirstName && reply.userLastName 
      ? `${reply.userFirstName} ${reply.userLastName}`.trim()
      : reply.userName || 'Người dùng';
    
    const avatar = reply.userAvatar || '/default-avatar.png';
    
    return (
      <div key={reply.idComment} className={`fb-comment__reply-wrapper fb-comment__reply--depth-${depth}`}>
        <div className="fb-comment fb-comment--reply">
          <img 
            src={avatar}
            alt={name}
            className="fb-comment__avatar"
          />
          <div className="fb-comment__content">
            {editingComment === reply.idComment ? (
              // Edit Mode
              <div className="fb-comment__edit">
                <input
                  type="text"
                  value={editInputs[reply.idComment] || ''}
                  onChange={(e) => setEditInputs(prev => ({ ...prev, [reply.idComment]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitEdit(reply.idComment);
                    } else if (e.key === 'Escape') {
                      handleToggleEdit(reply.idComment, reply.content);
                    }
                  }}
                  className="fb-comment__edit-field"
                  disabled={submittingEdit[reply.idComment]}
                  autoFocus
                />
                <div className="fb-comment__edit-actions">
                  <button
                    type="button"
                    onClick={() => handleToggleEdit(reply.idComment, reply.content)}
                    disabled={submittingEdit[reply.idComment]}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmitEdit(reply.idComment)}
                    disabled={submittingEdit[reply.idComment] || !editInputs[reply.idComment]?.trim()}
                    className="btn-primary"
                  >
                    {submittingEdit[reply.idComment] ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            ) : (
              // View Mode
              <>
                <div className="fb-comment__bubble">
                  <strong>{name}</strong>
                  <p>{reply.content}</p>
                </div>
                <div className="fb-comment__actions">
                  <button type="button">Thích</button>
                  <button 
                    type="button" 
                    onClick={() => setReplyingTo(prev => prev === reply.idComment ? null : reply.idComment)}
                  >
                    Phản hồi
                  </button>
                  {currentUser?.id === reply.idUser && (
                    <>
                      <button 
                        type="button" 
                        onClick={() => handleToggleEdit(reply.idComment, reply.content)}
                      >
                        Chỉnh sửa
                      </button>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteComment(reply.idComment)}
                      >
                        Xóa
                      </button>
                    </>
                  )}
                  <time>{formatCommentTime(reply.createdAt)}</time>
                  {reply.updatedAt && new Date(reply.updatedAt).getTime() !== new Date(reply.createdAt).getTime() && (
                    <span className="fb-comment__edited"> • Đã chỉnh sửa</span>
                  )}
                </div>
                
                {/* Show nested replies toggle button */}
                {hasNestedReplies && depth < maxDepth && (
                  <button 
                    type="button"
                    className="fb-comment__view-replies"
                    onClick={() => handleToggleNestedReplies(reply.idComment)}
                  >
                    {isExpanded ? '▼' : '▶'} {reply.replyCount || reply.replies!.length} phản hồi
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Reply Input - Outside fb-comment div, sibling */}
        {replyingTo === reply.idComment && (
          <div className="fb-reply-input">
            <img 
              src={currentUser?.avatar || '/default-avatar.png'} 
              alt="Your avatar" 
              className="fb-reply-input__avatar"
            />
            <div className="fb-reply-input__field-wrapper">
              <input
                type="text"
                placeholder="Viết phản hồi..."
                value={replyInputs[reply.idComment] || ''}
                onChange={(e) => setReplyInputs(prev => ({ ...prev, [reply.idComment]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitReply(reply.idComment);
                  }
                }}
                className="fb-reply-input__field"
                disabled={submittingReply[reply.idComment]}
              />
              {replyInputs[reply.idComment]?.trim() && (
                <button
                  type="button"
                  onClick={() => handleSubmitReply(reply.idComment)}
                  disabled={submittingReply[reply.idComment]}
                  className="fb-reply-input__submit"
                >
                  {submittingReply[reply.idComment] ? '...' : '➤'}
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Nested Replies - Outside fb-comment div, sibling */}
        {hasNestedReplies && isExpanded && depth < maxDepth && (
          <div className="fb-comment__replies">
            {reply.replies!.map(nestedReply => renderReply(nestedReply, postId, depth + 1))}
          </div>
        )}
      </div>
    );
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
            
            {/* {isOwner && (
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
            )} */}
          </header>

          <div className="poster-detail-card__content">
            <p>{poster.content}</p>
          </div>

          {poster.imageUrls && poster.imageUrls.length > 0 && (
            <div className="poster-detail-card__images">
              {poster.imageUrls.length === 1 ? (
                poster.imageUrls[0].startsWith('data:video/') ? (
                  <video
                    src={poster.imageUrls[0]}
                    controls
                    className="poster-detail-card__video-single"
                  >
                    Your browser does not support video.
                  </video>
                ) : (
                  <img
                    src={poster.imageUrls[0]}
                    alt="Ảnh bài đăng"
                    className="poster-detail-card__image-single"
                    onClick={() => openImageViewer(poster.imageUrls!, 0)}
                  />
                )
              ) : (
                <div className={`poster-detail-card__image-grid ${
                  poster.imageUrls.length === 2 ? 'grid-two' :
                  poster.imageUrls.length === 3 ? 'grid-three' :
                  'grid-four-plus'
                }`}>
                  {poster.imageUrls.map((media, idx) => (
                    media.startsWith('data:video/') ? (
                      <video
                        key={idx}
                        src={media}
                        controls
                        className="poster-detail-card__video-grid-item"
                      >
                        Your browser does not support video.
                      </video>
                    ) : (
                      <img
                        key={idx}
                        src={media}
                        alt={`Ảnh ${idx + 1}`}
                        className="poster-detail-card__image-grid-item"
                        onClick={() => openImageViewer(poster.imageUrls!, idx)}
                      />
                    )
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stats Section */}
          <div className="poster-detail-card__stats-bar">
            <div className="stats-left">
              <span className={likeCount > 0 ? 'has-reactions' : ''}>
                👍 {likeCount.toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="stats-right">
              <span className="stats-item">{commentCount} bình luận</span>
              <span className="stats-item">0 lượt chia sẻ</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="poster-detail-card__actions-bar">
            <button 
              className={`action-btn ${userLiked ? 'active liked' : ''}`}
              onClick={handleLikeToggle}
              disabled={likingInProgress}
            >
              {userLiked ? '❤️ Đã thích' : '👍 Thích'}
            </button>
            <button className="action-btn">
              💬 Bình luận
            </button>
            <button className="action-btn">
              ↗️ Chia sẻ
            </button>
          </div>

          {/* Comments Section */}
          <div className="poster-detail-card__comments fb-post__comments">
            <h3 className="comments-title">Bình luận ({commentCount})</h3>
            
            {/* Comment Input */}
            {currentUser && (
              <div className="fb-comment-input">
                <img
                  src={currentUser.avatar || '/default-avatar.png'}
                  alt={currentUser.username}
                  className="fb-comment-input__avatar"
                />
                <div className="fb-comment-input__field-wrapper">
                  <input
                    type="text"
                    placeholder="Viết bình luận..."
                    className="fb-comment-input__field"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    disabled={submittingComment}
                  />
                  {commentInput.trim() && (
                    <button
                      type="button"
                      onClick={handleSubmitComment}
                      disabled={submittingComment}
                      className="fb-comment-input__submit"
                    >
                      {submittingComment ? '...' : '➤'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Comments List */}
            {loadingComments ? (
              <div className="fb-comments-loading">Đang tải bình luận...</div>
            ) : comments.length > 0 ? (
              <div className="fb-comments-list">
                {comments.map(comment => (
                  <div key={comment.idComment} className="fb-comment">
                    <img 
                      src={comment.userAvatar || '/default-avatar.png'} 
                      alt={`${comment.userFirstName} ${comment.userLastName}`}
                      className="fb-comment__avatar"
                    />
                    <div className="fb-comment__content">
                      {editingComment === comment.idComment ? (
                        // Edit Mode
                        <div className="fb-comment__edit">
                          <input
                            type="text"
                            value={editInputs[comment.idComment] || ''}
                            onChange={(e) => setEditInputs(prev => ({ ...prev, [comment.idComment]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmitEdit(comment.idComment);
                              } else if (e.key === 'Escape') {
                                handleToggleEdit(comment.idComment, comment.content);
                              }
                            }}
                            className="fb-comment__edit-field"
                            disabled={submittingEdit[comment.idComment]}
                            autoFocus
                          />
                          <div className="fb-comment__edit-actions">
                            <button
                              type="button"
                              onClick={() => handleToggleEdit(comment.idComment, comment.content)}
                              disabled={submittingEdit[comment.idComment]}
                            >
                              Hủy
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSubmitEdit(comment.idComment)}
                              disabled={submittingEdit[comment.idComment] || !editInputs[comment.idComment]?.trim()}
                              className="btn-primary"
                            >
                              {submittingEdit[comment.idComment] ? 'Đang lưu...' : 'Lưu'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="fb-comment__bubble">
                            <strong>
                              {comment.userFirstName && comment.userLastName 
                                ? `${comment.userFirstName} ${comment.userLastName}`.trim()
                                : comment.userName || 'Người dùng'}
                            </strong>
                            <p>{comment.content}</p>
                          </div>
                          <div className="fb-comment__meta">
                            <span>{formatCommentTime(comment.createdAt)}</span>
                            <button type="button">Thích</button>
                            <button 
                              type="button"
                              onClick={() => handleToggleReply(comment.idComment)}
                            >
                              Phản hồi
                            </button>
                            {currentUser?.id === comment.idUser && (
                              <>
                                <button 
                                  type="button"
                                  onClick={() => handleToggleEdit(comment.idComment, comment.content)}
                                >
                                  Sửa
                                </button>
                                <button 
                                  type="button"
                                  onClick={() => handleDeleteComment(comment.idComment)}
                                >
                                  Xóa
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                      
                      {/* Reply Input */}
                      {replyingTo === comment.idComment && (
                        <div className="fb-reply-input">
                          <img 
                            src={currentUser?.avatar || '/default-avatar.png'} 
                            alt="Your avatar" 
                            className="fb-reply-input__avatar"
                          />
                          <div className="fb-reply-input__field-wrapper">
                            <input
                              type="text"
                              placeholder="Viết phản hồi..."
                              value={replyInputs[comment.idComment] || ''}
                              onChange={(e) => setReplyInputs(prev => ({ ...prev, [comment.idComment]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSubmitReply(comment.idComment);
                                }
                              }}
                              className="fb-reply-input__field"
                              disabled={submittingReply[comment.idComment]}
                            />
                            {replyInputs[comment.idComment]?.trim() && (
                              <button
                                type="button"
                                onClick={() => handleSubmitReply(comment.idComment)}
                                disabled={submittingReply[comment.idComment]}
                                className="fb-reply-input__submit"
                              >
                                {submittingReply[comment.idComment] ? '...' : '➤'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Replies - Using recursive renderReply */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="fb-comment__replies">
                          {comment.replies.map(reply => renderReply(reply, posterId || '', 1))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="fb-comments-empty">Chưa có bình luận nào</div>
            )}
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
