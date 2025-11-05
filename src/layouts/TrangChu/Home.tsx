import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Home.css';
import { getVisiblePosters, deletePoster } from '../../api/poster/posterApi';
import { getUserInfo } from '../../api/user/loginApi';
import { connect, subscribe } from '../../api/websocket/stompClient';
import type { StompSubscription } from '@stomp/stompjs';
import ImageViewer from '../../components/ImageViewer';
import { likePoster, unlikePoster, getTotalLikes, checkUserLikedPoster, setUserLikedPoster } from '../../api/poster/likeApi';
import { getCommentsByPosterId, formatCommentTime, countTotalComments, createComment, replyToComment, updateComment, deleteComment, type Comment } from '../../api/poster/commentApi';
import { getUserById } from '../../api/user/userApi';

interface Story {
	id: number;
	name: string;
	image: string;
	label?: string;
	isCreate?: boolean;
}

interface VideoDTO {
	url: string;
	thumbnailUrl?: string;
	duration?: number;
	fileSize?: number;
}

interface Post {
	id: string; // UUID từ backend
	authorId: string; // UUID của user
	authorName: string;
	authorAvatar: string;
	time: string;
	audience: 'public' | 'friends' | 'private';
	content: string;
	image?: string;
	images?: string[]; // Thêm để support nhiều ảnh
	videos?: VideoDTO[]; // Thêm để support video
	reactions: number;
	comments: number;
	shares: number;
}

const stories: Story[] = [
	{
		id: 1,
		name: 'Bạn',
		image: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=400&q=80',
		label: 'Tạo tin',
		isCreate: true,
	},
	{
		id: 2,
		name: 'Đồng Quốc An',
		image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
	},
	{
		id: 3,
		name: '2000',
		image: 'https://images.unsplash.com/photo-1575936123452-b67c3203c357?auto=format&fit=crop&w=400&q=80',
	},
	{
		id: 4,
		name: 'Wind Watch',
		image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=400&q=80',
	},
	{
		id: 5,
		name: 'Anh Đa Đen',
		image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=400&q=80',
	},
];

const shortcuts = [
	{ id: 1, label: 'Bạn bè', icon: '👥' },
	{ id: 2, label: 'Kỷ niệm', icon: '🗓️' },
	{ id: 3, label: 'Đã lưu', icon: '📑' },
	// { id: 4, label: 'Trang và Trang cá nhân', icon: '📄' },
	{ id: 4, label: 'Nhóm', icon: '👪' },
	{ id: 5, label: 'Marketplace', icon: '🛒' },
];

const contacts = [
	{ id: 1, name: 'Lan Nguyễn', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=80&q=80', active: true },
	{ id: 2, name: 'Trí A5', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80', active: true },
	{ id: 3, name: 'Tuấn IT', avatar: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=80&q=80', active: false },
	{ id: 4, name: 'Team NodeJS', avatar: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=80&q=80', active: true },
	{ id: 5, name: 'Gia đình', avatar: 'https://images.unsplash.com/photo-1525182008055-f88b95ff7980?auto=format&fit=crop&w=80&q=80', active: false },
];

const Home: React.FC = () => {
	const storiesRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const [canScrollPrev, setCanScrollPrev] = useState(false);
	const [canScrollNext, setCanScrollNext] = useState(false);
	const [posts, setPosts] = useState<Post[]>([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const observerRef = useRef<IntersectionObserver | null>(null);
	const lastPostRef = useRef<HTMLDivElement | null>(null);
	
	// Image viewer state
	const [viewerOpen, setViewerOpen] = useState(false);
	const [viewerImages, setViewerImages] = useState<string[]>([]);
	const [viewerIndex, setViewerIndex] = useState(0);
	
	// Like state
	const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
	const [userLikedPosts, setUserLikedPosts] = useState<Record<string, boolean>>({});
	const [likingInProgress, setLikingInProgress] = useState<Record<string, boolean>>({});
	
	// Comment state
	const [comments, setComments] = useState<Record<string, Comment[]>>({});
	const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
	const [showComments, setShowComments] = useState<Record<string, boolean>>({});
	const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
	const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
	const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});
	
	// Delete/Edit state
	const [deletingPost, setDeletingPost] = useState<Record<string, boolean>>({});
	
	// Reply state
	const [replyingTo, setReplyingTo] = useState<Record<string, string>>({}); // commentId -> postId
	const [replyInputs, setReplyInputs] = useState<Record<string, string>>({}); // commentId -> content
	const [submittingReply, setSubmittingReply] = useState<Record<string, boolean>>({}); // commentId -> loading
	
	// Edit state
	const [editingComment, setEditingComment] = useState<Record<string, string>>({}); // commentId -> postId
	const [editInputs, setEditInputs] = useState<Record<string, string>>({}); // commentId -> content
	const [submittingEdit, setSubmittingEdit] = useState<Record<string, boolean>>({}); // commentId -> loading
	
	// Nested replies expand state
	const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({}); // commentId -> expanded
	
	// Use ref for WebSocket subscriptions to prevent re-subscription
	const subscriptionsRef = useRef<StompSubscription[]>([]);
	const currentUserRef = useRef<any>(null);

	// Helper function to get full name
	const getFullName = (poster: any): string => {
		if (poster.userFirstName && poster.userLastName) {
			return ` ${poster.userFirstName} ${poster.userLastName}`;
		}
		return poster.userName || 'Người dùng';
	};

	// Helper function to convert PosterDTO to Post
	const convertPosterToPost = useCallback((poster: any, index?: number): Post => {
		// Tính thời gian đã đăng
		const createdDate = new Date(poster.createdAt);
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));
		
		let timeStr = '';
		if (diffInMinutes < 60) {
			timeStr = `${diffInMinutes} phút trước`;
		} else if (diffInMinutes < 1440) {
			timeStr = `${Math.floor(diffInMinutes / 60)} giờ trước`;
		} else {
			timeStr = `${Math.floor(diffInMinutes / 1440)} ngày trước`;
		}

		// Map privacy status
		let audience: 'public' | 'friends' | 'private' = 'public';
		if (poster.privacyStatusName === 'PUBLIC') {
			audience = 'public';
		} else if (poster.privacyStatusName === 'FRIENDS') {
			audience = 'friends';
		} else if (poster.privacyStatusName === 'PRIVATE') {
			audience = 'private';
		}

		return {
			id: poster.idPoster, // UUID từ backend
			authorId: poster.idUser, // UUID của user
			authorName: getFullName(poster), // Họ Tên đầy đủ
			authorAvatar: poster.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
			time: timeStr,
			audience,
			content: poster.content,
			images: poster.imageUrls && poster.imageUrls.length > 0 ? poster.imageUrls : undefined,
			image: poster.imageUrls && poster.imageUrls.length > 0 ? poster.imageUrls[0] : undefined,
			videos: poster.videos, // Map videos array từ backend
			reactions: 0,
			comments: 0,
			shares: 0
		};
	}, []);

	// Fetch posters từ backend
	// Fetch posts with pagination
	const fetchPosts = useCallback(async (pageNum: number = 0) => {
		try {
			if (pageNum === 0) {
				setLoading(true);
			} else {
				setLoadingMore(true);
			}
			
			// Lấy thông tin user hiện tại
			const currentUser = getUserInfo();
			console.log('📱 Current user:', currentUser);
			currentUserRef.current = currentUser;
			
			if (!currentUser?.id) {
				console.warn('⚠️ No user logged in, cannot fetch posters');
				setPosts([]);
				setHasMore(false);
				return;
			}
			
			// Fetch posters với privacy filter
			console.log('🔍 Fetching visible posters for user:', currentUser.id, 'page:', pageNum);
			const posters = await getVisiblePosters(currentUser.id);
			console.log('✅ Received posters:', posters.length, posters);
			
			// Paginate manually (slice posts)
			const PAGE_SIZE = 5;
			const start = pageNum * PAGE_SIZE;
			const end = start + PAGE_SIZE;
			const paginatedPosters = posters.slice(start, end);
			
			if (paginatedPosters.length < PAGE_SIZE) {
				setHasMore(false);
			}
			
			// Chuyển đổi PosterDTO sang Post
			const convertedPosts: Post[] = paginatedPosters.map((poster, index) => {
				const post = convertPosterToPost(poster, index);
				if (poster.videos && poster.videos.length > 0) {
					console.log('🎥 Poster with videos:', {
						posterId: poster.idPoster,
						videos: poster.videos,
						convertedPost: post
					});
				}
				return post;
			});

			if (pageNum === 0) {
				setPosts(convertedPosts);
			} else {
				setPosts(prev => [...prev, ...convertedPosts]);
			}
			console.log('✅ Converted posts:', convertedPosts.length);
			
			// Fetch like counts for all posts
			const likeCountsData: Record<string, number> = {};
			const userLikedData: Record<string, boolean> = {};
			
			await Promise.all(
				convertedPosts.map(async (post) => {
					try {
						const count = await getTotalLikes(post.id);
						likeCountsData[post.id] = count;
						
						// Check if current user liked this post
						if (currentUser?.id) {
							userLikedData[post.id] = checkUserLikedPoster(post.id, currentUser.id);
						}
					} catch (error) {
						console.error(`❌ Error fetching likes for post ${post.id}:`, error);
						likeCountsData[post.id] = 0;
						userLikedData[post.id] = false;
					}
				})
			);
			
			if (pageNum === 0) {
				setLikeCounts(likeCountsData);
				setUserLikedPosts(userLikedData);
			} else {
				setLikeCounts(prev => ({ ...prev, ...likeCountsData }));
				setUserLikedPosts(prev => ({ ...prev, ...userLikedData }));
			}
			console.log('✅ Like counts loaded:', likeCountsData);
			
			// Fetch comment counts for all posts
			const commentCountsData: Record<string, number> = {};
			await Promise.all(
				convertedPosts.map(async (post) => {
					try {
						const postComments = await getCommentsByPosterId(post.id);
						const totalCount = countTotalComments(postComments);
						commentCountsData[post.id] = totalCount;
					} catch (error) {
						console.error(`❌ Error fetching comments for post ${post.id}:`, error);
						commentCountsData[post.id] = 0;
					}
				})
			);
			
			if (pageNum === 0) {
				setCommentCounts(commentCountsData);
			} else {
				setCommentCounts(prev => ({ ...prev, ...commentCountsData }));
			}
			console.log('✅ Comment counts loaded:', commentCountsData);
		} catch (error) {
			console.error('❌ Error loading posters:', error);
			setHasMore(false);
		} finally {
			if (pageNum === 0) {
				setLoading(false);
			} else {
				setLoadingMore(false);
			}
		}
	}, [convertPosterToPost]);

	// Initial load
	useEffect(() => {
		fetchPosts(0);
		setPage(0);
	}, [fetchPosts]);

	// Intersection Observer for infinite scroll
	useEffect(() => {
		// Cleanup previous observer
		if (observerRef.current) {
			observerRef.current.disconnect();
		}

		// Create new observer
		observerRef.current = new IntersectionObserver(
			(entries) => {
				const firstEntry = entries[0];
				if (firstEntry.isIntersecting && hasMore && !loadingMore && !loading) {
					console.log('📜 Loading more posts...');
					const nextPage = page + 1;
					setPage(nextPage);
					fetchPosts(nextPage);
				}
			},
			{ threshold: 0.5 }
		);

		// Observe last post element
		if (lastPostRef.current) {
			observerRef.current.observe(lastPostRef.current);
		}

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [hasMore, loadingMore, loading, page, fetchPosts]);

	// WebSocket subscriptions for realtime updates
	useEffect(() => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			console.warn('⚠️ No user for WebSocket subscription');
			return;
		}

		console.log('🔌 Setting up WebSocket subscriptions for poster feed...');

		// Connect and subscribe
		connect(() => {
			console.log('✅ WebSocket connected, subscribing to poster topics...');

			// Subscribe to new posters
			const newPosterSub = subscribe('/topic/posters', (message) => {
				try {
					const newPoster = JSON.parse(message.body);
					console.log('🆕 Received new poster:', newPoster);

					// Check if user can see this poster based on privacy
					const isOwner = newPoster.userId === currentUser.id;
					const isPublic = newPoster.privacyStatusName === 'PUBLIC';
					
					// Add to feed if public or owner (friends check would need API call)
					if (isPublic || isOwner) {
						const newPost = convertPosterToPost(newPoster);
						setPosts(prevPosts => [newPost, ...prevPosts]);
						console.log('✅ Added new poster to feed');
					} else {
						console.log('🔒 Poster not visible to current user (privacy)');
					}
				} catch (error) {
					console.error('❌ Error handling new poster:', error);
				}
			});
			if (newPosterSub) subscriptionsRef.current.push(newPosterSub);

			// Subscribe to updated posters
			const updatedPosterSub = subscribe('/topic/posters/updated', (message) => {
				try {
					const updatedPoster = JSON.parse(message.body);
					console.log('📝 Received updated poster:', updatedPoster);

					setPosts(prevPosts => 
						prevPosts.map(post => {
							// Match by poster UUID
							if (post.id === updatedPoster.idPoster) {
								return convertPosterToPost(updatedPoster);
							}
							return post;
						})
					);
					console.log('✅ Updated poster in feed');
				} catch (error) {
					console.error('❌ Error handling updated poster:', error);
				}
			});
			if (updatedPosterSub) subscriptionsRef.current.push(updatedPosterSub);

			// Subscribe to deleted posters
			const deletedPosterSub = subscribe('/topic/posters/deleted', (message) => {
				try {
					const deletedPosterId = message.body; // Just the ID string
					console.log('🗑️ Received deleted poster ID:', deletedPosterId);

					// Remove from feed by poster UUID
					setPosts(prevPosts => prevPosts.filter(post => post.id !== deletedPosterId));
					console.log('✅ Removed deleted poster from feed');
				} catch (error) {
					console.error('❌ Error handling deleted poster:', error);
				}
			});
			if (deletedPosterSub) subscriptionsRef.current.push(deletedPosterSub);

			console.log('✅ All poster WebSocket subscriptions set up');
		});

		// Cleanup subscriptions on unmount
		return () => {
			console.log('🔌 Unsubscribing from poster topics...');
			subscriptionsRef.current.forEach(sub => {
				try {
					sub.unsubscribe();
				} catch (error) {
					console.error('Error unsubscribing:', error);
				}
			});
			subscriptionsRef.current = [];
		};
	}, [convertPosterToPost]); // Only depend on stable function

	const updateStoryNav = useCallback(() => {
		const el = storiesRef.current;
		if (!el) return;
		const { scrollLeft, scrollWidth, clientWidth } = el;
		setCanScrollPrev(scrollLeft > 4);
		setCanScrollNext(scrollWidth - clientWidth - scrollLeft > 4);
	}, []);

	useEffect(() => {
		const el = storiesRef.current;
		if (!el) return;
		updateStoryNav();
		el.addEventListener('scroll', updateStoryNav);
		const handleResize = () => updateStoryNav();
		window.addEventListener('resize', handleResize);
		return () => {
			el.removeEventListener('scroll', updateStoryNav);
			window.removeEventListener('resize', handleResize);
		};
	}, [updateStoryNav]);

	const handleStoryNav = (direction: 'prev' | 'next') => {
		const el = storiesRef.current;
		if (!el) return;
		const scrollAmount = el.clientWidth * 0.9;
		el.scrollBy({
			left: direction === 'next' ? scrollAmount : -scrollAmount,
			behavior: 'smooth',
		});
	};

	// Delete post handler
	const handleDeletePost = async (postId: string, authorId: string) => {
		if (!window.confirm('Bạn có chắc chắn muốn xóa bài đăng này?')) {
			return;
		}

		setDeletingPost(prev => ({ ...prev, [postId]: true }));
		try {
			await deletePoster(postId, authorId);
			// WebSocket will handle removing from feed
			console.log('✅ Poster deleted successfully');
		} catch (err: any) {
			console.error('Error deleting poster:', err);
			alert(err.response?.data?.message || 'Không thể xóa bài đăng');
		} finally {
			setDeletingPost(prev => ({ ...prev, [postId]: false }));
		}
	};

	// Toggle comments visibility
	const handleToggleComments = async (postId: string) => {
		const isCurrentlyShown = showComments[postId] || false;
		
		if (isCurrentlyShown) {
			// Hide comments
			setShowComments(prev => ({ ...prev, [postId]: false }));
		} else {
			// Show comments - fetch if not already loaded
			if (!comments[postId]) {
				setLoadingComments(prev => ({ ...prev, [postId]: true }));
				try {
					const postComments = await getCommentsByPosterId(postId);
					
					// Fetch user data for all comments and replies
					const enrichedComments = await enrichCommentsWithUserData(postComments);
					
					setComments(prev => ({ ...prev, [postId]: enrichedComments }));
					console.log(`✅ Loaded comments for post ${postId}:`, enrichedComments);
				} catch (error) {
					console.error('❌ Error loading comments:', error);
				} finally {
					setLoadingComments(prev => ({ ...prev, [postId]: false }));
				}
			}
			setShowComments(prev => ({ ...prev, [postId]: true }));
		}
	};

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

	// Submit comment handler
	const handleSubmitComment = async (postId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để bình luận');
			return;
		}

		const content = commentInputs[postId]?.trim();
		if (!content) {
			return;
		}

		setSubmittingComment(prev => ({ ...prev, [postId]: true }));

		try {
			const newComment = await createComment(postId, currentUser.id, content);
			
			if (newComment) {
				// Fetch fresh user data from API to avoid encoding issues
				const userData = await getUserById(currentUser.id);
				
				// Enrich the new comment with fresh user data
				const enrichedComment: Comment = {
					...newComment,
					userName: userData?.username || currentUser.username || 'Người dùng',
					userAvatar: userData?.avatar || currentUser.avatar || '',
					userFirstName: userData?.firstName || currentUser.firstName || '',
					userLastName: userData?.lastName || currentUser.lastName || '',
					replies: [],
					replyCount: 0
				};

				// Add to comments list
				setComments(prev => ({
					...prev,
					[postId]: [enrichedComment, ...(prev[postId] || [])]
				}));

				// Update comment count
				setCommentCounts(prev => ({
					...prev,
					[postId]: (prev[postId] || 0) + 1
				}));

				// Clear input
				setCommentInputs(prev => ({ ...prev, [postId]: '' }));

				// Show comments if not already shown
				setShowComments(prev => ({ ...prev, [postId]: true }));

				console.log('✅ Comment added successfully');
			} else {
				alert('Không thể thêm bình luận. Vui lòng thử lại.');
			}
		} catch (error) {
			console.error('❌ Error submitting comment:', error);
			alert('Có lỗi xảy ra khi thêm bình luận.');
		} finally {
			setSubmittingComment(prev => ({ ...prev, [postId]: false }));
		}
	};

	// Toggle reply input for a comment
	const handleToggleReply = (commentId: string, postId: string) => {
		setReplyingTo(prev => {
			const current = prev[commentId];
			if (current) {
				// Close reply input
				const newState = { ...prev };
				delete newState[commentId];
				return newState;
			} else {
				// Open reply input
				return { ...prev, [commentId]: postId };
			}
		});
	};

	// Toggle nested replies visibility
	const handleToggleNestedReplies = (commentId: string) => {
		setExpandedReplies(prev => ({
			...prev,
			[commentId]: !prev[commentId]
		}));
	};

	// Submit reply to a comment
	const handleSubmitReply = async (postId: string, parentCommentId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để trả lời bình luận');
			return;
		}

		const content = replyInputs[parentCommentId]?.trim();
		if (!content) {
			return;
		}

		setSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));

		try {
			const newReply = await replyToComment(postId, parentCommentId, currentUser.id, content);
			
			if (newReply) {
				// Fetch fresh user data from API to avoid encoding issues
				const userData = await getUserById(currentUser.id);
				
				// Enrich the new reply with fresh user data
				const enrichedReply: Comment = {
					...newReply,
					userName: userData?.username || currentUser.username || 'Người dùng',
					userAvatar: userData?.avatar || currentUser.avatar || '',
					userFirstName: userData?.firstName || currentUser.firstName || '',
					userLastName: userData?.lastName || currentUser.lastName || '',
					replies: [],
					replyCount: 0
				};

				// Add reply to the parent comment's replies (keep nested structure)
				setComments(prev => {
					const postComments = [...(prev[postId] || [])];
					
					// Recursively find and update the parent comment
					const updateCommentReplies = (commentsList: Comment[]): Comment[] => {
						return commentsList.map(comment => {
							if (comment.idComment === parentCommentId) {
								// Found the parent - add reply
								return {
									...comment,
									replies: [enrichedReply, ...(comment.replies || [])],
									replyCount: (comment.replyCount || 0) + 1
								};
							} else if (comment.replies && comment.replies.length > 0) {
								// Search in nested replies
								return {
									...comment,
									replies: updateCommentReplies(comment.replies)
								};
							}
							return comment;
						});
					};

					return {
						...prev,
						[postId]: updateCommentReplies(postComments)
					};
				});
				
				// Auto-expand parent to show new reply
				setExpandedReplies(prev => ({
					...prev,
					[parentCommentId]: true
				}));

				// Update comment count
				setCommentCounts(prev => ({
					...prev,
					[postId]: (prev[postId] || 0) + 1
				}));

				// Clear reply input and close reply form
				setReplyInputs(prev => {
					const newState = { ...prev };
					delete newState[parentCommentId];
					return newState;
				});
				setReplyingTo(prev => {
					const newState = { ...prev };
					delete newState[parentCommentId];
					return newState;
				});

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

	// Toggle edit mode for a comment
	const handleToggleEdit = (commentId: string, postId: string, currentContent: string) => {
		setEditingComment(prev => {
			const current = prev[commentId];
			if (current) {
				// Close edit mode
				const newState = { ...prev };
				delete newState[commentId];
				return newState;
			} else {
				// Open edit mode and populate current content
				setEditInputs(prevInputs => ({ ...prevInputs, [commentId]: currentContent }));
				return { ...prev, [commentId]: postId };
			}
		});
	};

	// Submit edited comment
	const handleSubmitEdit = async (postId: string, commentId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để sửa bình luận');
			return;
		}

		const content = editInputs[commentId]?.trim();
		if (!content) {
			return;
		}

		setSubmittingEdit(prev => ({ ...prev, [commentId]: true }));

		try {
			const updatedComment = await updateComment(postId, commentId, currentUser.id, content);
			
			if (updatedComment) {
				// Update comment in state
				setComments(prev => {
					const postComments = [...(prev[postId] || [])];
					
					// Recursively update the comment
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

					return {
						...prev,
						[postId]: updateCommentContent(postComments)
					};
				});

				// Close edit mode
				setEditInputs(prev => {
					const newState = { ...prev };
					delete newState[commentId];
					return newState;
				});
				setEditingComment(prev => {
					const newState = { ...prev };
					delete newState[commentId];
					return newState;
				});

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
	const handleDeleteComment = async (postId: string, commentId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để xóa bình luận');
			return;
		}

		// Confirm deletion
		if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này?')) {
			return;
		}

		try {
			const success = await deleteComment(postId, commentId, currentUser.id);
			
			if (success) {
				// Remove comment from state
				setComments(prev => {
					const postComments = [...(prev[postId] || [])];
					
					// Recursively remove the comment
					const removeComment = (commentsList: Comment[]): Comment[] => {
						return commentsList.filter(comment => {
							if (comment.idComment === commentId) {
								return false; // Remove this comment
							} else if (comment.replies && comment.replies.length > 0) {
								// Check replies recursively
								comment.replies = removeComment(comment.replies);
							}
							return true;
						});
					};

					return {
						...prev,
						[postId]: removeComment(postComments)
					};
				});

				// Update comment count
				setCommentCounts(prev => ({
					...prev,
					[postId]: Math.max(0, (prev[postId] || 0) - 1)
				}));

				console.log('✅ Comment deleted successfully');
			} else {
				alert('Không thể xóa bình luận. Vui lòng thử lại.');
			}
		} catch (error) {
			console.error('❌ Error deleting comment:', error);
			alert('Có lỗi xảy ra khi xóa bình luận.');
		}
	};

	// Like/Unlike handler
	const handleLikeToggle = async (postId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để thích bài viết');
			return;
		}

		// Prevent multiple clicks
		if (likingInProgress[postId]) {
			return;
		}

		const isCurrentlyLiked = userLikedPosts[postId] || false;
		const currentCount = likeCounts[postId] || 0;

		// Optimistic update
		setUserLikedPosts(prev => ({ ...prev, [postId]: !isCurrentlyLiked }));
		setLikeCounts(prev => ({ 
			...prev, 
			[postId]: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1 
		}));
		setLikingInProgress(prev => ({ ...prev, [postId]: true }));

		try {
			let success = false;
			if (isCurrentlyLiked) {
				// Unlike
				success = await unlikePoster(postId, currentUser.id);
				if (success) {
					setUserLikedPoster(postId, currentUser.id, false);
					console.log('✅ Unliked post:', postId);
				}
			} else {
				// Like
				success = await likePoster(postId, currentUser.id);
				if (success) {
					setUserLikedPoster(postId, currentUser.id, true);
					console.log('✅ Liked post:', postId);
				}
			}

			if (!success) {
				// Revert on failure
				setUserLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
				setLikeCounts(prev => ({ ...prev, [postId]: currentCount }));
			} else {
				// Fetch updated count from server
				const newCount = await getTotalLikes(postId);
				setLikeCounts(prev => ({ ...prev, [postId]: newCount }));
			}
		} catch (error) {
			console.error('❌ Error toggling like:', error);
			// Revert on error
			setUserLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
			setLikeCounts(prev => ({ ...prev, [postId]: currentCount }));
		} finally {
			setLikingInProgress(prev => ({ ...prev, [postId]: false }));
		}
	};

	// Image viewer handlers
	const openImageViewer = (images: string[], index: number) => {
		setViewerImages(images);
		setViewerIndex(index);
		setViewerOpen(true);
	};

	const closeImageViewer = () => {
		setViewerOpen(false);
	};

	const nextImage = () => {
		setViewerIndex(prev => Math.min(prev + 1, viewerImages.length - 1));
	};

	const prevImage = () => {
		setViewerIndex(prev => Math.max(prev - 1, 0));
	};

	// Recursive render function for nested replies
	const renderReply = (reply: Comment, postId: string, depth: number = 1) => {
		const hasNestedReplies = reply.replies && reply.replies.length > 0;
		const isExpanded = expandedReplies[reply.idComment];
		const maxDepth = 3; // Limit nesting depth for UI
		
		return (
			<div key={reply.idComment} className={`fb-comment__reply-wrapper fb-comment__reply--depth-${depth}`}>
				<div className="fb-comment fb-comment--reply">
				<NavLink to={`/user/${reply.idUser}`} className="fb-post__author">
					<img 
						src={reply.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
						alt={`${reply.userFirstName} ${reply.userLastName}`}
						className="fb-comment__avatar"
					/>
				</NavLink>
				<div className="fb-comment__content">
					{editingComment[reply.idComment] ? (
						// Edit Mode
						<div className="fb-comment__edit">
							<input
								type="text"
								value={editInputs[reply.idComment] || ''}
								onChange={(e) => setEditInputs(prev => ({ ...prev, [reply.idComment]: e.target.value }))}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleSubmitEdit(postId, reply.idComment);
									} else if (e.key === 'Escape') {
										handleToggleEdit(reply.idComment, postId, reply.content);
									}
								}}
								className="fb-comment__edit-field"
								disabled={submittingEdit[reply.idComment]}
								autoFocus
							/>
							<div className="fb-comment__edit-actions">
								<button
									type="button"
									onClick={() => handleToggleEdit(reply.idComment, postId, reply.content)}
									disabled={submittingEdit[reply.idComment]}
								>
									Hủy
								</button>
								<button
									type="button"
									onClick={() => handleSubmitEdit(postId, reply.idComment)}
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
								<strong>
									{reply.userFirstName && reply.userLastName 
										? `${reply.userFirstName} ${reply.userLastName}`.trim()
										: reply.userName || 'Người dùng'}
								</strong>
								<p>{reply.content}</p>
							</div>
							<div className="fb-comment__meta">
								<span>{formatCommentTime(reply.createdAt)}</span>
								<button type="button">Thích</button>
								<button 
									type="button"
									onClick={() => handleToggleReply(reply.idComment, postId)}
								>
									Phản hồi
								</button>
								{currentUserRef.current?.id === reply.idUser && (
									<>
										<button 
											type="button"
											onClick={() => handleToggleEdit(reply.idComment, postId, reply.content)}
										>
											Sửa
										</button>
										<button 
											type="button"
											onClick={() => handleDeleteComment(postId, reply.idComment)}
										>
											Xóa
										</button>
									</>
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
				
				{/* Reply Input - outside comment bubble */}
				{replyingTo[reply.idComment] && (
					<div className="fb-reply-input">
						<img 
							src={currentUserRef.current?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
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
										handleSubmitReply(postId, reply.idComment);
									}
								}}
								className="fb-reply-input__field"
								disabled={submittingReply[reply.idComment]}
							/>
							{replyInputs[reply.idComment]?.trim() && (
								<button
									type="button"
									onClick={() => handleSubmitReply(postId, reply.idComment)}
									disabled={submittingReply[reply.idComment]}
									className="fb-reply-input__submit"
								>
									{submittingReply[reply.idComment] ? '...' : '➤'}
								</button>
							)}
						</div>
					</div>
				)}
				
				{/* Nested Replies */}
				{hasNestedReplies && isExpanded && depth < maxDepth && (
					<div className="fb-comment__replies">
						{reply.replies!.map(nestedReply => renderReply(nestedReply, postId, depth + 1))}
					</div>
				)}
			</div>
		);
	};

	return (
		<div className="fb-home">
			<main className="fb-main">
				<aside className="fb-sidebar" aria-label="Phím tắt">
					<ul>
						{shortcuts.map(item => (
							<li key={item.id}>
								<span className="icon" aria-hidden="true">{item.icon}</span>
								<span>{item.label}</span>
							</li>
						))}
					</ul>
					<Link to="/settings" className="fb-sidebar__more">Xem thêm</Link>
				</aside>

						<section className="fb-feed" aria-label="Bảng tin">
							<div className="fb-stories-wrapper">
								<button
									type="button"
									className="fb-stories__nav prev"
									onClick={() => handleStoryNav('prev')}
									disabled={!canScrollPrev}
									aria-label="Xem tin trước"
								>
									‹
								</button>
								<div className="fb-stories" aria-label="Tin nổi bật" ref={storiesRef}>
									{stories.map(story => (
										<article key={story.id} className={`fb-story ${story.isCreate ? 'create' : ''}`}>
											<img src={story.image} alt={story.name} className="fb-story__image" />
											<div className="fb-story__overlay" />
											<div className="fb-story__content">
									{story.isCreate ? (
										<>
											<span className="fb-story__plus">＋</span>
											<span className="fb-story__label">{story.label}</span>
										</>
									) : (
										<>
											<span className="fb-story__avatar">{story.name.charAt(0)}</span>
											<span className="fb-story__name">{story.name}</span>
										</>
									)}
								</div>
							</article>
						))}
								</div>
								<button
									type="button"
									className="fb-stories__nav next"
									onClick={() => handleStoryNav('next')}
									disabled={!canScrollNext}
									aria-label="Xem tin tiếp"
								>
									›
								</button>
					</div>

				<section className="fb-composer" aria-label="Tạo bài viết">
					<div className="fb-composer__top">
						<img 
							src={currentUserRef.current?.avatar || "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=80&q=80"} 
							alt="Ảnh đại diện của bạn" 
						/>
						<button 
							type="button"
							onClick={() => navigate('/create-poster')}
						>
							{currentUserRef.current?.lastName || 'Bạn'} ơi, bạn đang nghĩ gì thế?
						</button>
					</div>
					<div className="fb-composer__actions">
						<button type="button" onClick={() => navigate('/create-poster')}>🎥 Video trực tiếp</button>
						<button type="button" onClick={() => navigate('/create-poster')}>📷 Ảnh/video</button>
						<button type="button" onClick={() => navigate('/create-poster')}>😊 Cảm xúc/hoạt động</button>
					</div>
				</section>					{loading ? (
						<div className="fb-loading">
							<p>Đang tải bài viết...</p>
						</div>
					) : posts.length === 0 ? (
						<div className="fb-empty">
							<p>Chưa có bài viết nào</p>
						</div>
					) : (
						posts.map((post, index) => (
							<article 
								key={post.id} 
								className="fb-post"
								ref={index === posts.length - 1 ? lastPostRef : null}
								style={{ position: 'relative' }}
							>
								{/* Loading overlay khi đang xóa */}
								{deletingPost[post.id] && (
									<div style={{
										position: 'absolute',
										top: 0,
										left: 0,
										right: 0,
										bottom: 0,
										backgroundColor: 'rgba(255, 255, 255, 0.8)',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										zIndex: 10,
										borderRadius: '8px'
									}}>
										<div style={{ textAlign: 'center' }}>
											<div className="spinner" style={{
												border: '4px solid #f3f3f3',
												borderTop: '4px solid #3498db',
												borderRadius: '50%',
												width: '40px',
												height: '40px',
												animation: 'spin 1s linear infinite',
												margin: '0 auto 10px'
											}}></div>
											<p style={{ color: '#333', fontWeight: 'bold' }}>Đang xóa bài viết...</p>
										</div>
									</div>
								)}
								<header className="fb-post__header">
									<NavLink to={`/user/${post.authorId}`} className="fb-post__author">
										<img src={post.authorAvatar} alt={`Ảnh đại diện của ${post.authorName}`} />
									</NavLink>
									<div>
										<strong>{post.authorName}</strong>
										<div className="fb-post__meta">
											<span>{post.time}</span>
											<span aria-hidden="true">·</span>
											<span>
												{post.audience === 'public' && '🌍 Công khai'}
												{post.audience === 'friends' && '👥 Bạn bè'}
												{post.audience === 'private' && '🔒 Chỉ mình tôi'}
											</span>
										</div>
									</div>
									<button className="fb-post__more" aria-label="Tùy chọn bài viết">⋯</button>
								</header>
							<p className="fb-post__content">{post.content}</p>
							
							{/* Render Images */}
							{post.images && post.images.length > 0 && (
								<figure className="fb-post__image">
									{post.images.length === 1 ? (
										post.images[0].startsWith('data:video/') ? (
											<video 
												src={post.images[0]} 
												controls
												className="fb-post__video"
											>
												Your browser does not support video.
											</video>
										) : (
											<img 
												src={post.images[0]} 
												alt={`Ảnh của ${post.authorName}`}
												onClick={() => openImageViewer(post.images!, 0)}
											/>
										)
									) : (
										<div className={`fb-post__image-grid ${post.images.length === 2 ? 'fb-post__image-grid--two' : ''}`}>
											{post.images.slice(0, 4).map((media, idx) => (
												media.startsWith('data:video/') ? (
													<video 
														key={idx}
														src={media} 
														controls
														className="fb-post__video-grid"
													>
														Your browser does not support video.
													</video>
												) : (
													<img 
														key={idx} 
														src={media} 
														alt={`Ảnh ${idx + 1} của ${post.authorName}`}
														onClick={() => openImageViewer(post.images!, idx)}
													/>
												)
											))}
											{post.images.length > 4 && (
												<div 
													className="fb-post__image-more"
													onClick={() => openImageViewer(post.images!, 3)}
												>
													+{post.images.length - 4}
												</div>
											)}
										</div>
									)}
								</figure>
							)}

							{/* Render Videos from videos array */}
							{post.videos && post.videos.length > 0 && (
								<figure className="fb-post__image">
									{post.videos.map((video, idx) => {
										// Debug logs
										if (idx === 0) {
											console.log('🎥 Rendering videos for post:', post.id, post.videos);
										}
										console.log('🎬 Video URL:', video.url);
										
										if (!video.url) {
											console.error('❌ Video URL is empty!');
											return null;
										}
										
										return (
											<div key={idx} className="fb-post__video-wrapper">
												<video 
													src={video.url} 
													controls
													controlsList="nodownload"
													className="fb-post__video"
													poster={video.thumbnailUrl}
													preload="metadata"
													onLoadStart={() => console.log('📹 Video loading started:', video.url)}
													onCanPlay={() => console.log('✅ Video can play:', video.url)}
													onError={(e) => {
														console.error('❌ Video load error:', {
															error: e,
															url: video.url,
															type: e.currentTarget?.error?.code,
															message: e.currentTarget?.error?.message
														});
													}}
												>
													<source src={video.url} type="video/mp4" />
													<source src={video.url} type="video/webm" />
													Your browser does not support the video tag.
												</video>
											</div>
										);
									})}
								</figure>
							)}
							<footer className="fb-post__footer">
									<div className="fb-post__stats">
										<span className={likeCounts[post.id] > 0 ? 'has-reactions' : ''}>
											👍 {(likeCounts[post.id] || 0).toLocaleString('vi-VN')}
										</span>
										<span 
											onClick={() => handleToggleComments(post.id)}
											className="fb-post__stats-clickable"
										>
											{(commentCounts[post.id] || 0)} bình luận
										</span>
										<span>{post.shares} lượt chia sẻ</span>
									</div>
									<div className="fb-post__actions">
										<button 
											type="button"
											className={`fb-post__action-btn ${userLikedPosts[post.id] ? 'liked' : ''}`}
											onClick={() => handleLikeToggle(post.id)}
											disabled={likingInProgress[post.id]}
										>
											{userLikedPosts[post.id] ? '❤️ Đã thích' : '👍 Thích'}
										</button>
										<button 
											type="button" 
											className="fb-post__action-btn"
											onClick={() => handleToggleComments(post.id)}
										>
											💬 Bình luận
										</button>
										<button type="button" className="fb-post__action-btn">↗️ Chia sẻ</button>
										<button 
											type="button" 
											onClick={() => navigate(`/poster/${post.id}`)}
											className="fb-post__action-btn btn-view-detail"
										>
											📄 Xem chi tiết
										</button>
										{/* {currentUserRef.current && post.authorId === currentUserRef.current.id && (
											<button 
												type="button" 
												onClick={() => handleDeletePost(post.id, post.authorId)}
												className="fb-post__action-btn btn-delete"
											>
												🗑️ Xóa
											</button>
										)} */}
									</div>
									
									{/* Comments Section */}
									{showComments[post.id] && (
										<div className="fb-post__comments">
											{/* Comment Input */}
											<div className="fb-comment-input">
												<img 
													src={currentUserRef.current?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'}
													alt="Your avatar"
													className="fb-comment-input__avatar"
												/>
												<div className="fb-comment-input__field">
													<input
														type="text"
														placeholder="Viết bình luận..."
														value={commentInputs[post.id] || ''}
														onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
														onKeyPress={(e) => {
															if (e.key === 'Enter' && !submittingComment[post.id]) {
																handleSubmitComment(post.id);
															}
														}}
														disabled={submittingComment[post.id]}
													/>
													{commentInputs[post.id]?.trim() && (
														<button
															type="button"
															onClick={() => handleSubmitComment(post.id)}
															disabled={submittingComment[post.id]}
															className="fb-comment-input__submit"
														>
															{submittingComment[post.id] ? '...' : '➤'}
														</button>
													)}
												</div>
											</div>

											{loadingComments[post.id] ? (
												<div className="fb-comments-loading">Đang tải bình luận...</div>
											) : comments[post.id] && comments[post.id].length > 0 ? (
												<div className="fb-comments-list">
													{comments[post.id].map(comment => (
														<div key={comment.idComment} className="fb-comment">
															<NavLink to={`/user/${comment.idUser}`} className="fb-post__author">
															<img 
																src={comment.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
																alt={`${comment.userFirstName} ${comment.userLastName}`}
																className="fb-comment__avatar"
															/>
															</NavLink>
															<div className="fb-comment__content">
																{editingComment[comment.idComment] ? (
																	// Edit Mode
																	<div className="fb-comment__edit">
																		<input
																			type="text"
																			value={editInputs[comment.idComment] || ''}
																			onChange={(e) => setEditInputs(prev => ({ ...prev, [comment.idComment]: e.target.value }))}
																			onKeyDown={(e) => {
																				if (e.key === 'Enter' && !e.shiftKey) {
																					e.preventDefault();
																					handleSubmitEdit(post.id, comment.idComment);
																				} else if (e.key === 'Escape') {
																					handleToggleEdit(comment.idComment, post.id, comment.content);
																				}
																			}}
																			className="fb-comment__edit-field"
																			disabled={submittingEdit[comment.idComment]}
																			autoFocus
																		/>
																		<div className="fb-comment__edit-actions">
																			<button
																				type="button"
																				onClick={() => handleToggleEdit(comment.idComment, post.id, comment.content)}
																				disabled={submittingEdit[comment.idComment]}
																			>
																				Hủy
																			</button>
																			<button
																				type="button"
																				onClick={() => handleSubmitEdit(post.id, comment.idComment)}
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
																				onClick={() => handleToggleReply(comment.idComment, post.id)}
																			>
																				Phản hồi
																			</button>
																			{currentUserRef.current?.id === comment.idUser && (
																				<>
																					<button 
																						type="button"
																						onClick={() => handleToggleEdit(comment.idComment, post.id, comment.content)}
																					>
																						Sửa
																					</button>
																					<button 
																						type="button"
																						onClick={() => handleDeleteComment(post.id, comment.idComment)}
																					>
																						Xóa
																					</button>
																				</>
																			)}
																		</div>
																	</>
																)}
																
																{/* Reply Input */}
																{replyingTo[comment.idComment] && (
																	<div className="fb-reply-input">
																		
																		<img 
																			src={currentUserRef.current?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
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
																						handleSubmitReply(post.id, comment.idComment);
																					}
																				}}
																				className="fb-reply-input__field"
																				disabled={submittingReply[comment.idComment]}
																			/>
																			{replyInputs[comment.idComment]?.trim() && (
																				<button
																					type="button"
																					onClick={() => handleSubmitReply(post.id, comment.idComment)}
																					disabled={submittingReply[comment.idComment]}
																					className="fb-reply-input__submit"
																				>
																					{submittingReply[comment.idComment] ? '...' : '➤'}
																				</button>
																			)}
																		</div>
																	</div>
																)}
																
																{/* Replies - using recursive render */}
																{comment.replies && comment.replies.length > 0 && (
																	<div className="fb-comment__replies">
																		{comment.replies.map(reply => renderReply(reply, post.id, 1))}
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
									)}
								</footer>
							</article>
						))
					)}
					
					{/* Loading More Indicator */}
					{loadingMore && (
						<div className="fb-loading-more">
							<div className="fb-spinner"></div>
							<p>Đang tải thêm bài viết...</p>
						</div>
					)}
					
					{/* No More Posts */}
					{!hasMore && posts.length > 0 && (
						<div className="fb-no-more-posts">
							<p>Đã hiển thị tất cả bài viết</p>
						</div>
					)}
				</section>

				<aside className="fb-rightbar" aria-label="Liên hệ">
					<h3>Người liên hệ</h3>
					<ul>
						{contacts.map(contact => (
							<li key={contact.id}>
								<div className="avatar">
									<img src={contact.avatar} alt={contact.name} />
									<span className={contact.active ? 'status active' : 'status'} aria-hidden="true" />
								</div>
								<span>{contact.name}</span>
							</li>
						))}
					</ul>
					<div className="fb-rightbar__download">
						<p>Tải ChatWeb cho máy tính để trò chuyện nhanh hơn.</p>
						<a href="https://www.microsoft.com/store/apps" target="_blank" rel="noreferrer noopener">Tải ứng dụng</a>
					</div>
				</aside>
			</main>

			{/* Image Viewer Modal */}
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

export default Home;
