import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import { getVisiblePosters, deletePoster } from '../../api/poster/posterApi';
import { getUserInfo } from '../../api/user/loginApi';
import { connect, subscribe } from '../../api/websocket/stompClient';
import type { StompSubscription } from '@stomp/stompjs';
import ImageViewer from '../../components/ImageViewer';

interface Story {
	id: number;
	name: string;
	image: string;
	label?: string;
	isCreate?: boolean;
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
	
	// Image viewer state
	const [viewerOpen, setViewerOpen] = useState(false);
	const [viewerImages, setViewerImages] = useState<string[]>([]);
	const [viewerIndex, setViewerIndex] = useState(0);
	
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
			reactions: 0,
			comments: 0,
			shares: 0
		};
	}, []);

	// Fetch posters từ backend
	useEffect(() => {
		const fetchPosters = async () => {
			try {
				setLoading(true);
				
				// Lấy thông tin user hiện tại
				const currentUser = getUserInfo();
				console.log('📱 Current user:', currentUser);
				currentUserRef.current = currentUser;
				
				if (!currentUser?.id) {
					console.warn('⚠️ No user logged in, cannot fetch posters');
					setPosts([]);
					return;
				}
				
				// Fetch posters với privacy filter
				console.log('🔍 Fetching visible posters for user:', currentUser.id);
				const posters = await getVisiblePosters(currentUser.id);
				console.log('✅ Received posters:', posters.length, posters);
				
				// Chuyển đổi PosterDTO sang Post
				const convertedPosts: Post[] = posters.map((poster, index) => 
					convertPosterToPost(poster, index)
				);

				setPosts(convertedPosts);
				console.log('✅ Converted posts:', convertedPosts.length);
			} catch (error) {
				console.error('❌ Error loading posters:', error);
			} finally {
				setLoading(false);
			}
		};

		fetchPosters();
	}, [convertPosterToPost]);

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

		try {
			await deletePoster(postId, authorId);
			// WebSocket will handle removing from feed
			console.log('✅ Poster deleted successfully');
		} catch (err: any) {
			console.error('Error deleting poster:', err);
			alert(err.response?.data?.message || 'Không thể xóa bài đăng');
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
						posts.map(post => (
							<article key={post.id} className="fb-post">
								<header className="fb-post__header">
									<img src={post.authorAvatar} alt={`Ảnh đại diện của ${post.authorName}`} />
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
							{post.images && post.images.length > 0 && (
								<figure className="fb-post__image">
									{post.images.length === 1 ? (
										<img 
											src={post.images[0]} 
											alt={`Ảnh của ${post.authorName}`}
											onClick={() => openImageViewer(post.images!, 0)}
										/>
									) : (
										<div className={`fb-post__image-grid ${post.images.length === 2 ? 'fb-post__image-grid--two' : ''}`}>
											{post.images.slice(0, 4).map((img, idx) => (
												<img 
													key={idx} 
													src={img} 
													alt={`Ảnh ${idx + 1} của ${post.authorName}`}
													onClick={() => openImageViewer(post.images!, idx)}
												/>
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
							<footer className="fb-post__footer">
									<div className="fb-post__stats">
										<span>👍 {post.reactions.toLocaleString('vi-VN')}</span>
										<span>{post.comments} bình luận</span>
										<span>{post.shares} lượt chia sẻ</span>
									</div>
									<div className="fb-post__actions">
										<button type="button">👍 Thích</button>
										<button type="button">💬 Bình luận</button>
										<button type="button">↗️ Chia sẻ</button>
										<button 
											type="button" 
											onClick={() => navigate(`/poster/${post.id}`)}
											className="btn-view-detail"
										>
											📄 Xem chi tiết
										</button>
										{/* {currentUserRef.current && post.authorId === currentUserRef.current.id && (
											<button 
												type="button" 
												onClick={() => handleDeletePost(post.id, post.authorId)}
												className="btn-delete"
											>
												🗑️ Xóa
											</button>
										)} */}
									</div>
								</footer>
							</article>
						))
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
