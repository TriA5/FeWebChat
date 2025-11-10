import React, { useState } from 'react';
import { 
	SharePosterDTO, 
	createShare, 
	deleteShare, 
	likeShare, 
	unlikeShare,
	getShareComments,
	createShareComment,
	replyToShareComment,
	ShareCommentDTO
} from '../../api/poster/shareApi';
import { getUserId } from '../../api/util/JwtService';
import { formatCommentTime } from '../../api/poster/commentApi';
import { NavLink } from 'react-router-dom';
import './ShareSection.css';

interface ShareSectionProps {
	share: SharePosterDTO;
	onDeleted?: () => void;
	onShareUpdated?: () => void;
}

const ShareSection: React.FC<ShareSectionProps> = ({ share, onDeleted, onShareUpdated }) => {
	const currentUserId = getUserId();
	const [isLiked, setIsLiked] = useState(false);
	const [likeCount, setLikeCount] = useState(share.likeCount);
	const [commentCount, setCommentCount] = useState(share.commentCount);
	const [showComments, setShowComments] = useState(false);
	const [comments, setComments] = useState<ShareCommentDTO[]>([]);
	const [commentInput, setCommentInput] = useState('');
	const [submittingComment, setSubmittingComment] = useState(false);
	const [loadingComments, setLoadingComments] = useState(false);
	
	// Reply state
	const [replyingTo, setReplyingTo] = useState<string | null>(null);
	const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
	const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({});

	const isOwner = currentUserId === share.idUser;

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

	const handleLikeToggle = async () => {
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

	const handleToggleComments = async () => {
		if (showComments) {
			setShowComments(false);
			return;
		}
		
		try {
			setLoadingComments(true);
			const data = await getShareComments(share.idShare);
			setComments(data);
			setShowComments(true);
		} catch (err) {
			console.error('Error loading comments:', err);
		} finally {
			setLoadingComments(false);
		}
	};

	const handleSubmitComment = async () => {
		if (!currentUserId || !commentInput.trim()) return;
		
		try {
			setSubmittingComment(true);
			const newComment = await createShareComment(share.idShare, {
				userId: currentUserId,
				content: commentInput.trim()
			});
			setComments(prev => [newComment, ...prev]);
			setCommentCount(prev => prev + 1);
			setCommentInput('');
		} catch (err) {
			console.error('Error posting comment:', err);
		} finally {
			setSubmittingComment(false);
		}
	};

	const handleSubmitReply = async (parentCommentId: string) => {
		if (!currentUserId || !replyInputs[parentCommentId]?.trim()) return;
		
		try {
			setSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));
			const newReply = await replyToShareComment(parentCommentId, {
				userId: currentUserId,
				content: replyInputs[parentCommentId].trim()
			});
			
			// Update comments tree
			setComments(prev => {
				const updateReplies = (comments: ShareCommentDTO[]): ShareCommentDTO[] => {
					return comments.map(c => {
						if (c.idCommentShare === parentCommentId) {
							return {
								...c,
								replies: [newReply, ...(c.replies || [])],
								replyCount: (c.replyCount || 0) + 1
							};
						}
						if (c.replies && c.replies.length > 0) {
							return {
								...c,
								replies: updateReplies(c.replies)
							};
						}
						return c;
					});
				};
				return updateReplies(prev);
			});
			
			setCommentCount(prev => prev + 1);
			setReplyInputs(prev => ({ ...prev, [parentCommentId]: '' }));
			setReplyingTo(null);
		} catch (err) {
			console.error('Error posting reply:', err);
		} finally {
			setSubmittingReply(prev => ({ ...prev, [parentCommentId]: false }));
		}
	};

	const renderComment = (comment: ShareCommentDTO, depth: number = 0) => {
		const maxDepth = 3;
		
		return (
			<div key={comment.idCommentShare} className={`share-comment depth-${depth}`}>
				<NavLink to={`/user/${comment.idUser}`}>
					<img 
						src={comment.userAvatar || '/default-avatar.png'} 
						alt={comment.userName}
						className="share-comment__avatar"
					/>
				</NavLink>
				<div className="share-comment__content">
					<div className="share-comment__bubble">
						<strong>{comment.userName}</strong>
						<p>{comment.content}</p>
					</div>
					<div className="share-comment__meta">
						<span>{formatCommentTime(comment.createdAt)}</span>
						<button type="button">Thích</button>
						{depth < maxDepth && (
							<button 
								type="button"
								onClick={() => setReplyingTo(comment.idCommentShare)}
							>
								Phản hồi
							</button>
						)}
					</div>
					
					{/* Reply Input */}
					{replyingTo === comment.idCommentShare && (
						<div className="share-reply-input">
							<input
								type="text"
								placeholder="Viết phản hồi..."
								value={replyInputs[comment.idCommentShare] || ''}
								onChange={(e) => setReplyInputs(prev => ({ 
									...prev, 
									[comment.idCommentShare]: e.target.value 
								}))}
								onKeyPress={(e) => {
									if (e.key === 'Enter') {
										handleSubmitReply(comment.idCommentShare);
									}
								}}
								disabled={submittingReply[comment.idCommentShare]}
							/>
							<button
								type="button"
								onClick={() => handleSubmitReply(comment.idCommentShare)}
								disabled={submittingReply[comment.idCommentShare]}
							>
								Gửi
							</button>
						</div>
					)}
					
					{/* Nested Replies */}
					{comment.replies && comment.replies.length > 0 && depth < maxDepth && (
						<div className="share-comment__replies">
							{comment.replies.map(reply => renderComment(reply, depth + 1))}
						</div>
					)}
				</div>
			</div>
		);
	};

	return (
		<div className="share-section">
			{/* Share Header */}
			<div className="share-section__header">
				<NavLink to={`/user/${share.idUser}`}>
					<img 
						src={share.userAvatar || '/default-avatar.png'} 
						alt={share.userName}
						className="share-section__avatar"
					/>
				</NavLink>
				<div className="share-section__author-info">
					<div className="share-section__author-name">{share.userName}</div>
					<div className="share-section__timestamp">
						{formatDate(share.createdAt)} • 
						<span className={`privacy-badge privacy-${share.privacyStatusName.toLowerCase()}`}>
							{share.privacyStatusName === 'PUBLIC' ? '🌍' :
							 share.privacyStatusName === 'FRIENDS' ? '👥' : '🔒'}
						</span>
					</div>
				</div>
				
				{isOwner && (
					<button className="share-section__delete" onClick={handleDelete}>
						🗑️
					</button>
				)}
			</div>

			{/* Share Content */}
			{share.content && (
				<div className="share-section__content">
					{share.content}
				</div>
			)}

			{/* Original Poster (Quoted) */}
			<div className="share-section__original">
				<div className="original-header">
					<img 
						src={share.originalPoster.userAvatar || '/default-avatar.png'} 
						alt={share.originalPoster.userName}
					/>
					<span>{share.originalPoster.userName}</span>
				</div>
				<div className="original-content">
					{share.originalPoster.content}
				</div>
				{share.originalPoster.images && share.originalPoster.images.length > 0 && (
					<div className="original-images">
						{share.originalPoster.images.slice(0, 3).map((img, idx) => (
							<img key={idx} src={img} alt="" />
						))}
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="share-section__actions">
				<button 
					className={`action-btn ${isLiked ? 'liked' : ''}`}
					onClick={handleLikeToggle}
				>
					{isLiked ? '❤️' : '👍'} {likeCount > 0 && likeCount}
				</button>
				<button className="action-btn" onClick={handleToggleComments}>
					💬 {commentCount > 0 && commentCount}
				</button>
			</div>

			{/* Comments */}
			{showComments && (
				<div className="share-section__comments">
					{/* Comment Input */}
					<div className="share-comment-input">
						<input
							type="text"
							placeholder="Viết bình luận..."
							value={commentInput}
							onChange={(e) => setCommentInput(e.target.value)}
							onKeyPress={(e) => {
								if (e.key === 'Enter') {
									handleSubmitComment();
								}
							}}
							disabled={submittingComment}
						/>
						<button
							type="button"
							onClick={handleSubmitComment}
							disabled={submittingComment || !commentInput.trim()}
						>
							Gửi
						</button>
					</div>

					{/* Comments List */}
					{loadingComments ? (
						<div className="share-comments-loading">Đang tải...</div>
					) : comments.length > 0 ? (
						<div className="share-comments-list">
							{comments.map(comment => renderComment(comment))}
						</div>
					) : (
						<div className="share-comments-empty">Chưa có bình luận</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ShareSection;
