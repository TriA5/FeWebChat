import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import './Home.css';
import { getVisiblePosters, deletePoster, getPosterById } from '../../api/poster/posterApi';
import { getUserInfo } from '../../api/user/loginApi';
import { connect, subscribe } from '../../api/websocket/stompClient';
import type { StompSubscription } from '@stomp/stompjs';
import ImageViewer from '../../components/ImageViewer';
import { getFriendsList } from '../../api/user/friendshipApi';
import { listGroups, listConversations } from '../../api/chat/chatApi';
import { likePoster, unlikePoster, getTotalLikes, checkUserLikedPoster, setUserLikedPoster } from '../../api/poster/likeApi';
import { getCommentsByPosterId, formatCommentTime, countTotalComments, createComment, replyToComment, updateComment, deleteComment, type Comment } from '../../api/poster/commentApi';
import { getUserById } from '../../api/user/userApi';
import { 
	SharePosterDTO, 
	getShareFeed, 
	createShare, 
	deleteShare,
	countSharesOfPoster,
	likeShare,
	unlikeShare,
	getLikeCountShare,
	checkIfUserLikedShare,
	getShareDetails,
	createShareComment,
	getShareComments,
	replyToShareComment,
	updateShareComment,
	deleteShareComment
} from '../../api/poster/shareApi';
import ShareSection from './ShareSection';
import WeatherWidget from '../util/WeatherWidget';

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
	// Share fields
	isShare?: boolean;
	shareId?: string;
	shareContent?: string;
	shareUserId?: string;
	shareUserName?: string;
	shareUserAvatar?: string;
	shareCreatedAt?: string;
	sharePrivacy?: 'public' | 'friends' | 'private';
	// Original poster fields (when post is a share)
	originalPosterId?: string;
	originalAuthorId?: string;
	originalAuthorName?: string;
	originalAuthorAvatar?: string;
	originalContent?: string;
	originalImages?: string[];
	originalVideos?: VideoDTO[];
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
	{ id: 6, label: 'Video trên Watch', icon: '📺' },
	{ id: 7, label: 'Sự kiện', icon: '🎉' },
	{ id: 8, label: 'Trang bạn quản lý', icon: '📄' },
	{ id: 9, label: 'Reels', icon: '🎞️' },
	{ id: 10, label: 'Trò chơi', icon: '🎮' },
	{ id: 11, label: 'Vị trí', icon: '📍' },
	{ id: 12, label: 'Thời tiết', icon: '⛅' },
	{ id: 13, label: 'Việc làm', icon: '💼' },
	{ id: 14, label: 'Hoạt động gần đây', icon: '🕘' },
	{ id: 15, label: 'Tin nhắn', icon: '💬' },
	{ id: 16, label: 'Trang cá nhân', icon: '🙍‍♂️' },
	{ id: 17, label: 'Cài đặt & Quyền riêng tư', icon: '⚙️' },
	{ id: 18, label: 'Trung tâm hỗ trợ', icon: '❓' },
	{ id: 19, label: 'Chơi game trên cloud', icon: '☁️🎮' },
	{ id: 20, label: 'Đơn hàng Marketplace', icon: '📦' },
	{ id: 21, label: 'Khoảnh khắc', icon: '📸' },
	{ id: 22, label: 'Nhạc', icon: '🎵' },
	{ id: 23, label: 'Phim', icon: '🎬' },
	{ id: 24, label: 'Sách', icon: '📘' },
	{ id: 25, label: 'Hoạt động được đề xuất', icon: '⭐' },
	{ id: 26, label: 'Phòng họp mặt', icon: '📞' },
	{ id: 27, label: 'Mua sắm trực tiếp', icon: '🛍️' },
	{ id: 28, label: 'Ứng dụng & Trò chơi', icon: '📱' },
	{ id: 29, label: 'Ví & Thanh toán', icon: '💳' },
	{ id: 30, label: 'Bảng xếp hạng game', icon: '🏆' }

];

interface Contact {
	id: string;
	name: string;
	avatar?: string;
	active: boolean;
	type: 'friend' | 'group';
}

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
	
	// Share state
	const [shareCounts, setShareCounts] = useState<Record<string, number>>({});
	const [showShareModal, setShowShareModal] = useState<string | null>(null); // posterId being shared
	const [shareContent, setShareContent] = useState('');
	const [sharePrivacy, setSharePrivacy] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>('PUBLIC');
	const [submittingShare, setSubmittingShare] = useState(false);
	const [postShares, setPostShares] = useState<Record<string, SharePosterDTO[]>>({}); // shares by postId
	const [showPostShares, setShowPostShares] = useState<Record<string, boolean>>({}); // show/hide shares by postId
	
	// Use ref for WebSocket subscriptions to prevent re-subscription
	const subscriptionsRef = useRef<StompSubscription[]>([]);
	const currentUserRef = useRef<any>(null);
	
	// Contacts state (friends and groups)
	const [dynamicContacts, setDynamicContacts] = useState<Contact[]>([]);
	const [loadingContacts, setLoadingContacts] = useState(true);
	
	// Expand content state
	const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

	// Helper function to get full name
	const getFullName = (poster: any): string => {
		if (poster.userFirstName && poster.userLastName) {
			return `${poster.userFirstName} ${poster.userLastName}`;
		}
		return poster.userName || 'Người dùng';
	};

	// Load friends and groups
	const loadContacts = useCallback(async () => {
			try {
				const me = getUserInfo();
				if (!me?.id) {
					setLoadingContacts(false);
					return;
				}

			const contactsList: Contact[] = [];
			const addedIds = new Set<string>(); // Track added contacts to avoid duplicates

			// Load conversations (people you chat with)
			try {
				const convs = await listConversations(me.id);
				if (convs && convs.length > 0) {
					for (const conv of convs) {
						const otherUserId = conv.participant1Id === me.id ? conv.participant2Id : conv.participant1Id;
						
						if (!addedIds.has(otherUserId)) {
							try {
								const userData = await getUserById(otherUserId);
								if (userData) {
									const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || 'Người dùng';
									contactsList.push({
										id: otherUserId,
										name: fullName,
										avatar: userData.avatar,
										active: Math.random() > 0.5,
										type: 'friend'
									});
									addedIds.add(otherUserId);
								}
							} catch (err) {
								console.error('Failed to load user:', otherUserId, err);
							}
						}
					}
				}
			} catch (err) {
				console.error('Failed to load conversations:', err);
			}

			// Load friends (skip if already added from conversations)
			try {
				const friends = await getFriendsList();
				if (friends && friends.length > 0) {
					friends.forEach((friend: any) => {
						const friendId = friend.userId === me.id ? friend.friendId : friend.userId;
						const friendData = friend.userId === me.id ? friend.friend : friend.user;
						
						if (friendData && friendId && !addedIds.has(friendId)) {
							const fullName = `${friendData.firstName || ''} ${friendData.lastName || ''}`.trim() || friendData.username || 'Bạn bè';
							contactsList.push({
								id: friendId,
								name: fullName,
								avatar: friendData.avatar,
								active: Math.random() > 0.5,
								type: 'friend'
							});
							addedIds.add(friendId);
						}
					});
				}
			} catch (err) {
				console.error('Failed to load friends:', err);
			}

			// Load groups
			try {
				const groups = await listGroups(me.id);
				if (groups && groups.length > 0) {
					groups.forEach((group: any) => {
						contactsList.push({
							id: group.id,
							name: group.groupName || 'Nhóm',
							avatar: undefined,
							active: false,
							type: 'group'
						});
					});
				}
			} catch (err) {
				console.error('Failed to load groups:', err);
			}

			console.log('📝 Loaded contacts:', contactsList.length, contactsList);
			setDynamicContacts(contactsList);
			setLoadingContacts(false);
		} catch (error) {
			console.error('Error loading contacts:', error);
			setLoadingContacts(false);
		}
	}, []);

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

	// Helper function to convert SharePosterDTO to Post
	const convertShareToPost = useCallback((share: SharePosterDTO): Post => {
		const now = new Date();
		const createdDate = new Date(share.createdAt);
		const diffInMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60));

		let timeStr = '';
		if (diffInMinutes < 1) {
			timeStr = 'Vừa xong';
		} else if (diffInMinutes < 60) {
			timeStr = `${diffInMinutes} phút trước`;
		} else if (diffInMinutes < 1440) {
			timeStr = `${Math.floor(diffInMinutes / 60)} giờ trước`;
		} else {
			timeStr = `${Math.floor(diffInMinutes / 1440)} ngày trước`;
		}

		// Map privacy status
		let audience: 'public' | 'friends' | 'private' = 'public';
		if (share.privacyStatusName === 'PUBLIC') {
			audience = 'public';
		} else if (share.privacyStatusName === 'FRIENDS') {
			audience = 'friends';
		} else if (share.privacyStatusName === 'PRIVATE') {
			audience = 'private';
		}

		return {
			id: share.idShare,
			authorId: share.idUser,
			authorName: share.userName,
			authorAvatar: share.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
			time: timeStr,
			audience,
			content: share.content,
			reactions: share.likeCount || 0,
			comments: share.commentCount || 0,
			shares: 0,
			// Share-specific fields
			isShare: true,
			shareId: share.idShare,
			shareContent: share.content,
			shareUserId: share.idUser,
			shareUserName: share.userName,
			shareUserAvatar: share.userAvatar,
			shareCreatedAt: share.createdAt,
			sharePrivacy: audience,
			// Original poster fields
			originalPosterId: share.originalPoster.idPoster,
			originalAuthorName: share.originalPoster.userName,
			originalAuthorAvatar: share.originalPoster.userAvatar,
			originalContent: share.originalPoster.content,
			originalImages: share.originalPoster.images,
			originalVideos: share.originalPoster.videos
		};
	}, []);

	// Helper function to recursively convert ShareCommentDTO to Comment
	const convertShareCommentToComment = useCallback((sc: any, postId: string): Comment => {
		const convert = (item: any): Comment => ({
			idComment: item.idCommentShare,
			idPoster: postId,
			content: item.content,
			idUser: item.idUser,
			parentCommentId: item.parentCommentId || null,
			createdAt: item.createdAt,
			updatedAt: item.updatedAt || item.createdAt,
			userName: item.userName,
			userAvatar: item.userAvatar,
			replyCount: item.replyCount || (item.replies ? item.replies.length : 0),
			// Recursively convert nested replies
			replies: item.replies ? item.replies.map((r: any) => convert(r)) : []
		});
		return convert(sc);
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
			
			// Fetch shares
			console.log('🔍 Fetching shares for user:', currentUser.id);
			const shares = await getShareFeed(currentUser.id);
			console.log('✅ Received shares:', shares.length, shares);
			
			// Convert posters to posts
			const postersAsPosts: Post[] = posters.map((poster, index) => {
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
			
			// Convert shares to posts
			const sharesAsPosts: Post[] = await Promise.all(
				shares.map(async (share) => {
					try {
						// Fetch user info for share author
						const userInfo = await getUserById(share.idUser);
						
						// Fetch original poster details
						const originalPoster = await getPosterById(share.originalPoster.idPoster);
						
						// Get full name with fallback
						const authorFullName = userInfo 
							? (`${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || userInfo.username || share.userName)
							: share.userName;
						
						const originalAuthorFullName = originalPoster
							? (`${originalPoster.userFirstName || ''} ${originalPoster.userLastName || ''}`.trim() || originalPoster.userName)
							: share.originalPoster.userName;
						
						// Convert with enriched data
						const post = convertShareToPost(share);
						return {
							...post,
							authorName: authorFullName,
							originalAuthorName: originalAuthorFullName,
							originalImages: originalPoster?.imageUrls || share.originalPoster.images || [],
							originalVideos: originalPoster?.videos || share.originalPoster.videos || []
						} as Post;
					} catch (error) {
						console.error('Error enriching share:', error);
						// Fallback to basic conversion
						return convertShareToPost(share);
					}
				})
			);
			
			// Merge and sort by date (newest first)
			const allPosts = [...postersAsPosts, ...sharesAsPosts].sort((a, b) => {
				// Sort by time string (will need proper date comparison)
				// For now, keep shares at top
				if (a.isShare && !b.isShare) return -1;
				if (!a.isShare && b.isShare) return 1;
				return 0;
			});
			
			// Paginate manually (slice posts)
			const PAGE_SIZE = 5;
			const start = pageNum * PAGE_SIZE;
			const end = start + PAGE_SIZE;
			const paginatedPosts = allPosts.slice(start, end);
			
			if (paginatedPosts.length < PAGE_SIZE) {
				setHasMore(false);
			}

			if (pageNum === 0) {
				setPosts(paginatedPosts);
			} else {
				setPosts(prev => [...prev, ...paginatedPosts]);
			}
			console.log('✅ Converted posts:', paginatedPosts.length);
			
			// Fetch like counts for all posts
			const likeCountsData: Record<string, number> = {};
			const userLikedData: Record<string, boolean> = {};
			
			await Promise.all(
				paginatedPosts.map(async (post) => {
					try {
						if (post.isShare) {
							// Use Share API for likes
							const countResult = await getLikeCountShare(post.id);
							// Handle if API returns object or number
							likeCountsData[post.id] = typeof countResult === 'number' ? countResult : (countResult as any)?.likeCount || 0;
							
							// Check if current user liked this share
							if (currentUser?.id) {
								const likeStatus = await checkIfUserLikedShare(post.id, currentUser.id);
								userLikedData[post.id] = likeStatus.isLiked;
							}
						} else {
							// Use Poster API for likes
							const count = await getTotalLikes(post.id);
							likeCountsData[post.id] = count;
							
							// Check if current user liked this post
							if (currentUser?.id) {
								userLikedData[post.id] = checkUserLikedPoster(post.id, currentUser.id);
							}
						}
					} catch (error) {
						console.error(`❌ Error fetching likes for ${post.isShare ? 'share' : 'post'} ${post.id}:`, error);
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
			
			// Fetch comment counts for all posts (both posters and shares)
			const commentCountsData: Record<string, number> = {};
			await Promise.all(
				paginatedPosts.map(async (post) => {
					try {
						if (post.isShare) {
							// For shares, fetch from API and count recursively
							const shareComments = await getShareComments(post.id);
							const totalCount = countTotalComments(shareComments.map((sc: any) => convertShareCommentToComment(sc, post.id)));
							commentCountsData[post.id] = totalCount;
						} else {
							// For posters, fetch from API
							const postComments = await getCommentsByPosterId(post.id);
							const totalCount = countTotalComments(postComments);
							commentCountsData[post.id] = totalCount;
						}
					} catch (error) {
						console.error(`❌ Error fetching comments for ${post.isShare ? 'share' : 'post'} ${post.id}:`, error);
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
			
			// Fetch share counts for all posts
			const shareCountsData: Record<string, number> = {};
			await Promise.all(
				paginatedPosts.filter(post => !post.isShare).map(async (post) => {
					try {
						const result = await countSharesOfPoster(post.id);
						shareCountsData[post.id] = result.shareCount || 0;
					} catch (error) {
						console.error(`❌ Error fetching shares for post ${post.id}:`, error);
						shareCountsData[post.id] = 0;
					}
				})
			);
			
			if (pageNum === 0) {
				setShareCounts(shareCountsData);
			} else {
				setShareCounts(prev => ({ ...prev, ...shareCountsData }));
			}
			console.log('✅ Share counts loaded:', shareCountsData);
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
}, [convertPosterToPost, convertShareToPost, convertShareCommentToComment]);	// Initial load
	useEffect(() => {
		fetchPosts(0);
		setPage(0);
		loadContacts(); // Load friends and groups
	}, [fetchPosts, loadContacts]);

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
					// Find the post to check if it's a share
					const post = posts.find(p => p.id === postId);
					const isShare = post?.isShare || false;
					
					let postComments: any[] = [];
					if (isShare) {
						// Use Share Comments API
						const shareComments = await getShareComments(postId);
						console.log('📝 Loaded share comments:', shareComments);
						
						// Convert ShareCommentDTO[] to Comment[] recursively
						postComments = shareComments.map((sc: any) => convertShareCommentToComment(sc, postId));
					} else {
						// Use Poster Comments API
						postComments = await getCommentsByPosterId(postId);
						console.log('📝 Loaded poster comments:', postComments);
					}
					
					// Fetch user data for all comments and replies
					const enrichedComments = await enrichCommentsWithUserData(postComments);
					
					setComments(prev => ({ ...prev, [postId]: enrichedComments }));
					console.log(`✅ Loaded comments for ${isShare ? 'share' : 'post'} ${postId}:`, enrichedComments);
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

		// Find the post to check if it's a share
		const post = posts.find(p => p.id === postId);
		const isShare = post?.isShare || false;

		setSubmittingComment(prev => ({ ...prev, [postId]: true }));

		try {
			let newComment;
			
			if (isShare) {
				// Use Share Comment API
				const shareComment = await createShareComment(postId, {
					userId: currentUser.id,
					content: content
				});
				
				// Convert ShareCommentDTO to Comment format
				newComment = {
					idComment: shareComment.idCommentShare,
					idPoster: postId, // Use shareId as posterId for consistency
					content: shareComment.content,
					idUser: shareComment.idUser,
					parentCommentId: shareComment.parentCommentId || null,
					createdAt: shareComment.createdAt,
					updatedAt: shareComment.updatedAt || shareComment.createdAt
				};
			} else {
				// Use Poster Comment API
				newComment = await createComment(postId, currentUser.id, content);
			}
			
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

				console.log('✅ Comment added successfully to', isShare ? 'share' : 'post');
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

		// Find the post to check if it's a share
		const post = posts.find(p => p.id === postId);
		const isShare = post?.isShare || false;

		setSubmittingReply(prev => ({ ...prev, [parentCommentId]: true }));

		try {
			let newReply: Comment | null | undefined;
			
			if (isShare) {
				// Use Share API
				const shareReply = await replyToShareComment(parentCommentId, {
					userId: currentUser.id,
					content: content
				});
				
				// Convert ShareCommentDTO to Comment format
				newReply = {
					idComment: shareReply.idCommentShare,
					idPoster: postId,
					content: shareReply.content,
					idUser: shareReply.idUser,
					parentCommentId: shareReply.parentCommentId || null,
					createdAt: shareReply.createdAt,
					updatedAt: shareReply.updatedAt || shareReply.createdAt,
					replies: [],
					replyCount: 0
				};
			} else {
				// Use Poster API
				newReply = await replyToComment(postId, parentCommentId, currentUser.id, content);
			}
			
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

		// Find the post to check if it's a share
		const post = posts.find(p => p.id === postId);
		const isShare = post?.isShare || false;

		setSubmittingEdit(prev => ({ ...prev, [commentId]: true }));

		try {
			let updatedComment: Comment | null | undefined;
			
			if (isShare) {
				// Use Share API
				const shareComment = await updateShareComment(commentId, {
					userId: currentUser.id,
					content: content
				});
				
				// Convert ShareCommentDTO to Comment format
				updatedComment = {
					idComment: shareComment.idCommentShare,
					idPoster: postId,
					content: shareComment.content,
					idUser: shareComment.idUser,
					parentCommentId: shareComment.parentCommentId || null,
					createdAt: shareComment.createdAt,
					updatedAt: shareComment.updatedAt || shareComment.createdAt,
					replies: [],
					replyCount: 0
				};
			} else {
				// Use Poster API
				updatedComment = await updateComment(postId, commentId, currentUser.id, content);
			}
			
			if (updatedComment) {
				// Store the updated comment value to avoid null/undefined issues in nested functions
				const updatedContent = updatedComment.content;
				const updatedTime = updatedComment.updatedAt;
				
				// Update comment in state
				setComments(prev => {
					const postComments = [...(prev[postId] || [])];
					
					// Recursively update the comment
					const updateCommentContent = (commentsList: Comment[]): Comment[] => {
						return commentsList.map(comment => {
							if (comment.idComment === commentId) {
								return {
									...comment,
									content: updatedContent,
									updatedAt: updatedTime
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

		// Find the post to check if it's a share
		const post = posts.find(p => p.id === postId);
		const isShare = post?.isShare || false;

		try {
			let success;
			
			if (isShare) {
				// Use Share API
				await deleteShareComment(commentId, currentUser.id);
				success = true;
			} else {
				// Use Poster API
				success = await deleteComment(postId, commentId, currentUser.id);
			}
			
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

		// Find the post to check if it's a share
		const post = posts.find(p => p.id === postId);
		const isShare = post?.isShare || false;

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
			if (isShare) {
				// Use Share API
				if (isCurrentlyLiked) {
					// Unlike share
					await unlikeShare(postId, currentUser.id);
					success = true;
					// Fetch updated count
					const countResult = await getLikeCountShare(postId);
					const newCount = typeof countResult === 'number' ? countResult : (countResult as any)?.likeCount || 0;
					setLikeCounts(prev => ({ ...prev, [postId]: newCount }));
					console.log('✅ Unliked share:', postId);
				} else {
					// Like share
					const result = await likeShare(postId, { userId: currentUser.id });
					success = !!result;
					if (success) {
						setLikeCounts(prev => ({ ...prev, [postId]: result.likeCount }));
					}
					console.log('✅ Liked share:', postId);
				}
			} else {
				// Use Poster API
				if (isCurrentlyLiked) {
					// Unlike poster
					success = await unlikePoster(postId, currentUser.id);
					if (success) {
						setUserLikedPoster(postId, currentUser.id, false);
						console.log('✅ Unliked post:', postId);
					}
				} else {
					// Like poster
					success = await likePoster(postId, currentUser.id);
					if (success) {
						setUserLikedPoster(postId, currentUser.id, true);
						console.log('✅ Liked post:', postId);
					}
				}
			}

			if (!success) {
				// Revert on failure
				setUserLikedPosts(prev => ({ ...prev, [postId]: isCurrentlyLiked }));
				setLikeCounts(prev => ({ ...prev, [postId]: currentCount }));
			} else if (!isShare) {
				// Fetch updated count from server (only for poster, share already updated above)
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

	// Share handlers
	const handleShareButtonClick = (postId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để chia sẻ bài viết');
			return;
		}
		setShowShareModal(postId);
	};

	const handleCreateShare = async (postId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để chia sẻ bài viết');
			return;
		}

		if (!shareContent.trim() && sharePrivacy !== 'PUBLIC') {
			alert('Vui lòng nhập nội dung chia sẻ');
			return;
		}

		setSubmittingShare(true);
		try {
			await createShare({
				posterId: postId,
				userId: currentUser.id,
				content: shareContent.trim(),
				privacyStatusName: sharePrivacy
			});
			
			// Close modal and reset
			setShowShareModal(null);
			setShareContent('');
			setSharePrivacy('PUBLIC');
			
			// Update share count
			const result = await countSharesOfPoster(postId);
			setShareCounts(prev => ({ ...prev, [postId]: result.shareCount || 0 }));
			
			alert('Chia sẻ bài viết thành công!');
		} catch (error) {
			console.error('❌ Error creating share:', error);
			alert('Không thể chia sẻ bài viết. Vui lòng thử lại.');
		} finally {
			setSubmittingShare(false);
		}
	};

	const handleTogglePostShares = async (postId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để xem chia sẻ');
			return;
		}

		if (showPostShares[postId]) {
			setShowPostShares(prev => ({ ...prev, [postId]: false }));
			return;
		}

		try {
			// For now, get all shares from feed and filter by posterId
			// Note: This is not ideal - backend should provide getSharesByPosterId API
			const allShares = await getShareFeed(currentUser.id);
			const filteredShares = allShares.filter(share => share.originalPoster.idPoster === postId);
			setPostShares(prev => ({ ...prev, [postId]: filteredShares }));
			setShowPostShares(prev => ({ ...prev, [postId]: true }));
		} catch (error) {
			console.error('❌ Error loading shares:', error);
			alert('Không thể tải danh sách chia sẻ');
		}
	};

	const handleDeleteShare = async (shareId: string) => {
		const currentUser = currentUserRef.current;
		if (!currentUser?.id) {
			alert('Vui lòng đăng nhập để xóa chia sẻ');
			return;
		}

		if (!window.confirm('Bạn có chắc muốn xóa bài chia sẻ này?')) {
			return;
		}

		try {
			await deleteShare(shareId, currentUser.id);
			// Remove from posts list
			setPosts(prev => prev.filter(post => post.id !== shareId));
			alert('Đã xóa bài chia sẻ thành công!');
		} catch (error) {
			console.error('❌ Error deleting share:', error);
			alert('Không thể xóa bài chia sẻ. Vui lòng thử lại.');
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
					
					{/* Weather Widget */}
					<WeatherWidget />
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
									<div style={{textAlign:"left"}}>
										<strong>{post.authorName}</strong>
										{post.isShare && <span className="share-indicator"> đã chia sẻ một bài viết</span>}
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
									{post.isShare && currentUserRef.current && post.authorId === currentUserRef.current.id && (
										<button 
											className="fb-post__delete-share"
											onClick={() => handleDeleteShare(post.id)}
											title="Xóa bài chia sẻ"
										>
											🗑️
										</button>
									)}
									{!post.isShare && (
										<button className="fb-post__more" aria-label="Tùy chọn bài viết">⋯</button>
									)}
								</header>

							{/* Share content (if this is a share) */}
							{post.isShare && post.shareContent && (
								<p className="fb-post__content">{post.shareContent}</p>
							)}

							{/* Original post (if this is a share) */}
							{post.isShare && post.originalPosterId ? (
								<div 
									className="fb-post__shared-content fb-post__shared-content--clickable"
									onClick={() => navigate(`/poster/${post.originalPosterId}`)}
								>
									<div className="shared-post-header">
										<img 
											src={post.originalAuthorAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&q=80'} 
											alt={post.originalAuthorName}
											className="shared-post-avatar"
										/>
										<div>
											<strong>{post.originalAuthorName}</strong>
										</div>
									</div>
									<p className="shared-post-content">{post.originalContent}</p>
									{post.originalImages && post.originalImages.length > 0 && (
										<div className="shared-post-images">
											{post.originalImages.slice(0, 3).map((img, idx) => (
												<img key={idx} src={img} alt={`Shared ${idx + 1}`} />
											))}
										</div>
									)}
									{post.originalVideos && post.originalVideos.length > 0 && (
										<div className="shared-post-videos">
											{post.originalVideos.slice(0, 1).map((video, idx) => (
												<video 
													key={idx} 
													src={video.url} 
													controls 
													poster={video.thumbnailUrl}
													onClick={(e) => e.stopPropagation()}
												/>
											))}
										</div>
									)}
								</div>
							) : (
								<>
							<div className="fb-post__content-wrapper">
								<p className={`fb-post__content ${expandedPosts[post.id] ? 'expanded' : ''}`}
								             style={{margin:"0"}}
								>
									{post.content}
								</p>
								{post.content && post.content.length > 200 && (
									<button 
										type="button"
										className="fb-post__see-more"
										onClick={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
									>
										{expandedPosts[post.id] ? 'Ẩn bớt' : 'Xem thêm'}
									</button>
								)}
							</div>
							
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
							</>
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
										{!post.isShare && (
											<button 
												type="button" 
												className="fb-post__action-btn"
												onClick={() => handleShareButtonClick(post.id)}
											>
												↗️ Chia sẻ ({shareCounts[post.id] || 0})
											</button>
										)}
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

									{/* Share Modal */}
									{showShareModal === post.id && (
										<div className="share-modal-overlay" onClick={() => setShowShareModal(null)}>
											<div className="share-modal" onClick={(e) => e.stopPropagation()}>
												<div className="share-modal__header">
													<h3>Chia sẻ bài viết</h3>
													<button 
														type="button" 
														className="share-modal__close"
														onClick={() => setShowShareModal(null)}
													>
														×
													</button>
												</div>
												<div className="share-modal__body">
													<div className="share-modal__privacy">
														<label>Quyền riêng tư:</label>
														<select 
															value={sharePrivacy} 
															onChange={(e) => setSharePrivacy(e.target.value as 'PUBLIC' | 'FRIENDS' | 'PRIVATE')}
														>
															<option value="PUBLIC">🌍 Công khai</option>
															<option value="FRIENDS">👥 Bạn bè</option>
															<option value="PRIVATE">🔒 Chỉ mình tôi</option>
														</select>
													</div>
													<textarea
														className="share-modal__textarea"
														placeholder="Chia sẻ suy nghĩ của bạn..."
														value={shareContent}
														onChange={(e) => setShareContent(e.target.value)}
														rows={4}
													/>
													<div className="share-modal__original">
														<div className="share-original-header">
															<img src={post.authorAvatar} alt={post.authorName} />
															<span>{post.authorName}</span>
														</div>
														<p>{post.content}</p>
														{post.images && post.images.length > 0 && (
															<div className="share-original-images">
																{post.images.slice(0, 3).map((img, idx) => (
																	<img key={idx} src={img} alt={`Preview ${idx + 1}`} />
																))}
															</div>
														)}
													</div>
												</div>
												<div className="share-modal__footer">
													<button 
														type="button"
														className="btn-cancel"
														onClick={() => setShowShareModal(null)}
														disabled={submittingShare}
													>
														Hủy
													</button>
													<button 
														type="button"
														className="btn-share"
														onClick={() => handleCreateShare(post.id)}
														disabled={submittingShare}
													>
														{submittingShare ? 'Đang chia sẻ...' : 'Chia sẻ ngay'}
													</button>
												</div>
											</div>
										</div>
									)}

									{/* Show Shares Button & Shares List */}
									
									{(shareCounts[post.id] || 0) > 0 && (
										<div className="post-shares-section">
											{/* <button
												type="button"
												className="btn-show-shares"
												onClick={() => handleTogglePostShares(post.id)}
											>
												{showPostShares[post.id] 
													? `▼ Ẩn ${shareCounts[post.id]} chia sẻ` 
													: `▶ Xem ${shareCounts[post.id]} chia sẻ`}
											</button> */}
											{/* {showPostShares[post.id] && postShares[post.id] && (
												<div className="post-shares-list">
													{postShares[post.id].map(share => (
														<ShareSection
															key={share.idShare}
															share={share}
															onDeleted={() => {
																// Refresh share count
																countSharesOfPoster(post.id).then(result => {
																	setShareCounts(prev => ({ ...prev, [post.id]: result.shareCount || 0 }));
																});
																// Remove from list
																setPostShares(prev => ({
																	...prev,
																	[post.id]: prev[post.id].filter(s => s.idShare !== share.idShare)
																}));
															}}
															onShareUpdated={() => {
																// Refresh shares list
																handleTogglePostShares(post.id);
															}}
														/>
													))}
												</div>
											)} */}
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
					<div style={{ 
						display: 'flex', 
						justifyContent: 'space-between', 
						alignItems: 'center',
						marginBottom: '12px'
					}}>
						<h3 style={{ margin: 0 }}>Người liên hệ</h3>
						{!loadingContacts && dynamicContacts.length > 0 && (
							<span style={{ 
								fontSize: '0.85rem', 
								color: '#65676b',
								fontWeight: '500'
							}}>
								{dynamicContacts.filter(c => c.type === 'friend').length} bạn bè, {dynamicContacts.filter(c => c.type === 'group').length} nhóm
							</span>
						)}
					</div>
					{loadingContacts ? (
						<div style={{ textAlign: 'center', padding: '20px', color: '#65676b' }}>
							<p>Đang tải...</p>
						</div>
					) : dynamicContacts.length === 0 ? (
						<div style={{ textAlign: 'center', padding: '20px', color: '#65676b' }}>
							<p>Chưa có liên hệ</p>
							<p style={{ fontSize: '0.85rem', marginTop: '8px' }}>Hãy kết bạn hoặc tham gia nhóm để bắt đầu chat!</p>
						</div>
					) : (
						<>
							{/* Friends Section */}
							{dynamicContacts.filter(c => c.type === 'friend').length > 0 && (
								<>
									<div style={{ 
										fontSize: '0.8rem', 
										color: '#65676b', 
										fontWeight: '600',
										marginTop: '16px',
										marginBottom: '8px',
										textTransform: 'uppercase',
										letterSpacing: '0.5px'
									}}>
										Bạn bè ({dynamicContacts.filter(c => c.type === 'friend').length})
									</div>
									<ul style={{ marginBottom: '16px' }}>
										{dynamicContacts.filter(c => c.type === 'friend').map(contact => (
											<li 
												key={contact.id}
												onClick={() => navigate('/chat')}
												style={{ cursor: 'pointer' }}
												title={`Chat với ${contact.name}`}
											>
												<div className="avatar">
													{contact.avatar ? (
														<img src={contact.avatar} alt={contact.name} />
													) : (
														<div style={{
															width: '36px',
															height: '36px',
															borderRadius: '50%',
															background: '#e4e6eb',
															display: 'flex',
															alignItems: 'center',
															justifyContent: 'center',
															fontSize: '1rem',
															fontWeight: 'bold',
															color: '#65676b'
														}}>
															{contact.name.charAt(0).toUpperCase()}
														</div>
													)}
													<span className={contact.active ? 'status active' : 'status'} aria-hidden="true" />
												</div>
												<span>{contact.name}</span>
											</li>
										))}
									</ul>
								</>
							)}

							{/* Groups Section */}
							{dynamicContacts.filter(c => c.type === 'group').length > 0 && (
								<>
									<div style={{ 
										fontSize: '0.8rem', 
										color: '#65676b', 
										fontWeight: '600',
										marginTop: '16px',
										marginBottom: '8px',
										textTransform: 'uppercase',
										letterSpacing: '0.5px'
									}}>
										Nhóm ({dynamicContacts.filter(c => c.type === 'group').length})
									</div>
									<ul>
										{dynamicContacts.filter(c => c.type === 'group').map(contact => (
											<li 
												key={contact.id}
												onClick={() => navigate('/chat')}
												style={{ cursor: 'pointer' }}
												title={`Chat nhóm ${contact.name}`}
											>
												<div className="avatar">
													<div style={{
														width: '36px',
														height: '36px',
														borderRadius: '50%',
														background: '#1877f2',
														display: 'flex',
														alignItems: 'center',
														justifyContent: 'center',
														fontSize: '1.2rem'
													}}>
														👥
													</div>
												</div>
												<span>{contact.name}</span>
											</li>
										))}
									</ul>
								</>
							)}
						</>
					)}
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
