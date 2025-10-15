import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

interface Story {
	id: number;
	name: string;
	image: string;
	label?: string;
	isCreate?: boolean;
}

interface Post {
	id: number;
	authorName: string;
	authorAvatar: string;
	time: string;
	audience: 'public' | 'friends';
	content: string;
	image?: string;
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

const posts: Post[] = [
	{
		id: 1,
		authorName: 'Tuyển dụng Thực tập sinh IT',
		authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
		time: '36 phút trước',
		audience: 'public',
		content: 'Giờ job backend về NodeJS hay Java nhiều hơn và cái nào lương cao hơn thế mọi người?',
		image: 'https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=1200&q=80',
		reactions: 120,
		comments: 48,
		shares: 7,
	},
	{
		id: 2,
		authorName: 'Wind Watch',
		authorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
		time: '1 giờ trước',
		audience: 'friends',
		content: 'Vừa về thêm rất nhiều mẫu đồng hồ giới hạn, anh em inbox ngay để giữ slot nhé! ⌚️',
		image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=1200&q=80',
		reactions: 86,
		comments: 23,
		shares: 5,
	},
	{
		id: 3,
		authorName: 'Đồng Quốc An',
		authorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=80',
		time: 'Hôm qua',
		audience: 'friends',
		content: 'Có ai muốn join team chạy bộ cuối tuần ở công viên Gia Định không? Tụi mình tập 6h sáng thứ 7 nè.',
		reactions: 64,
		comments: 12,
		shares: 2,
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
	const [canScrollPrev, setCanScrollPrev] = useState(false);
	const [canScrollNext, setCanScrollNext] = useState(false);

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
							<img src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=80&q=80" alt="Ảnh đại diện của bạn" />
							<button type="button">Thuận ơi, bạn đang nghĩ gì thế?</button>
						</div>
						<div className="fb-composer__actions">
							<button type="button">🎥 Video trực tiếp</button>
							<button type="button">📷 Ảnh/video</button>
							<button type="button">😊 Cảm xúc/hoạt động</button>
						</div>
					</section>

					{posts.map(post => (
						<article key={post.id} className="fb-post">
							<header className="fb-post__header">
								<img src={post.authorAvatar} alt={`Ảnh đại diện của ${post.authorName}`} />
								<div>
									<strong>{post.authorName}</strong>
									<div className="fb-post__meta">
										<span>{post.time}</span>
										<span aria-hidden="true">·</span>
										<span>{post.audience === 'public' ? '🌍 Công khai' : '👥 Bạn bè'}</span>
									</div>
								</div>
								<button className="fb-post__more" aria-label="Tùy chọn bài viết">⋯</button>
							</header>
							<p className="fb-post__content">{post.content}</p>
											{post.image && (
												<figure className="fb-post__image">
													<img src={post.image} alt={`Ảnh minh họa cho bài viết của ${post.authorName}`} />
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
								</div>
							</footer>
						</article>
					))}
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
		</div>
	);
};

export default Home;
