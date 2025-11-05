import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPosterById, updatePoster } from '../../api/poster/posterApi';
import { getUserInfo } from '../../api/user/loginApi';
import './EditPoster.css';

const EditPoster: React.FC = () => {
	const { posterId } = useParams<{ posterId: string }>();
	const navigate = useNavigate();
	const currentUser = getUserInfo();

	const [content, setContent] = useState('');
	const [privacyStatus, setPrivacyStatus] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>('PUBLIC');
	const [images, setImages] = useState<string[]>([]);
	const [videos, setVideos] = useState<string[]>([]);
	const [previews, setPreviews] = useState<string[]>([]);
	const [videoUrls, setVideoUrls] = useState<Array<{ url: string; thumbnailUrl?: string }>>([]);
	const [fileTypes, setFileTypes] = useState<Array<'image' | 'video'>>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	// Helper function to get full name
	const getFullName = (): string => {
		if (currentUser?.firstName && currentUser?.lastName) {
			return `${currentUser.lastName}`;
		}
		return currentUser?.username || 'Người dùng';
	};

	// Load poster data with useCallback to prevent infinite loop
	const loadPoster = useCallback(async () => {
		if (!posterId) return;

		const user = getUserInfo(); // Get user info inside the callback
		if (!user) return;

		try {
			setLoading(true);
			const poster = await getPosterById(posterId);
			
			// Check if user is owner
			if (poster.idUser !== user.id) {
				setError('Bạn không có quyền chỉnh sửa bài viết này');
				return;
			}

			setContent(poster.content);
			setPrivacyStatus(poster.privacyStatusName as any);
			
			// Load images
			if (poster.imageUrls && poster.imageUrls.length > 0) {
				setImages(poster.imageUrls);
				setPreviews(poster.imageUrls);
				setFileTypes(poster.imageUrls.map(() => 'image'));
			}
			
			// Load videos
			if (poster.videos && poster.videos.length > 0) {
				console.log('📹 Loading videos for edit:', poster.videos);
				setVideoUrls(poster.videos);
				// Add videos to previews
				const videoPreviewUrls = poster.videos.map(v => v.url);
				setPreviews(prev => [...prev, ...videoPreviewUrls]);
				const videoTypes = new Array(poster.videos.length).fill('video' as const);
				setFileTypes(prev => [...prev, ...videoTypes]);
			}
		} catch (err: any) {
			console.error('Error loading poster:', err);
			setError('Không thể tải bài viết');
		} finally {
			setLoading(false);
		}
	}, [posterId]);

	useEffect(() => {
		loadPoster();
	}, [loadPoster]);

	// Convert file to base64
	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = error => reject(error);
		});
	};

	// Handle image selection
	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		const fileArray = Array.from(files);
		
		// Limit to 10 images total
		if (fileArray.length + images.length > 10) {
			setError('Chỉ được tải lên tối đa 10 ảnh');
			return;
		}

		try {
			setError('');
			const base64Array = await Promise.all(
				fileArray.map(file => fileToBase64(file))
			);

			setImages(prev => [...prev, ...base64Array]);
			setPreviews(prev => [...prev, ...base64Array]);
		} catch (err) {
			console.error('Error converting images:', err);
			setError('Lỗi khi tải ảnh lên');
		}
	};

	// Remove image or video
	const removeImage = (index: number) => {
		const fileType = fileTypes[index];
		
		if (fileType === 'video') {
			// Remove from videoUrls
			const videoIndex = fileTypes.slice(0, index).filter(t => t === 'video').length;
			setVideoUrls(prev => prev.filter((_, i) => i !== videoIndex));
		} else {
			// Remove from images
			const imageIndex = fileTypes.slice(0, index).filter(t => t === 'image').length;
			setImages(prev => prev.filter((_, i) => i !== imageIndex));
		}
		
		setPreviews(prev => prev.filter((_, i) => i !== index));
		setFileTypes(prev => prev.filter((_, i) => i !== index));
	};

	// Handle submit
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!content.trim()) {
			setError('Vui lòng nhập nội dung bài viết');
			return;
		}

		if (!currentUser?.id || !posterId) {
			setError('Không tìm thấy thông tin người dùng');
			return;
		}

		try {
			setSaving(true);
			setError('');

			// Prepare data - always include videoUrls
			const updateData: any = {
				idUser: currentUser.id,
				content: content.trim(),
				privacyStatusName: privacyStatus,
				imageUrls: images.length > 0 ? images : [],
				videoUrls: videoUrls.length > 0 ? videoUrls.map(v => v.url) : []
			};

			console.log('📤 Updating poster with data:', updateData);

			await updatePoster(posterId, updateData);

			alert('✅ Đã cập nhật bài viết thành công!');
			navigate(`/poster/${posterId}`);
		} catch (err: any) {
			console.error('Error updating poster:', err);
			setError(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật bài viết');
		} finally {
			setSaving(false);
		}
	};

	if (loading) {
		return (
			<div className="edit-poster">
				<div className="edit-poster__loading">
					<div className="spinner"></div>
					<p>Đang tải bài viết...</p>
				</div>
			</div>
		);
	}

	if (error && !content) {
		return (
			<div className="edit-poster">
				<div className="edit-poster__error">
					<h2>❌ Lỗi</h2>
					<p>{error}</p>
					<button onClick={() => navigate(-1)} className="btn-back">
						Quay lại
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="edit-poster">
			{/* Loading Overlay khi đang lưu */}
			{saving && (
				<div style={{
					position: 'fixed',
					top: 0,
					left: 0,
					right: 0,
					bottom: 0,
					backgroundColor: 'rgba(0, 0, 0, 0.7)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					zIndex: 9999
				}}>
					<div style={{
						backgroundColor: 'white',
						padding: '30px',
						borderRadius: '12px',
						textAlign: 'center',
						boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
					}}>
						<div className="spinner" style={{
							border: '4px solid #f3f3f3',
							borderTop: '4px solid #1877f2',
							borderRadius: '50%',
							width: '50px',
							height: '50px',
							animation: 'spin 1s linear infinite',
							margin: '0 auto 15px'
						}}></div>
						<p style={{ color: '#333', fontWeight: 'bold', fontSize: '16px' }}>
							⏳ Đang lưu thay đổi...
						</p>
					</div>
				</div>
			)}

			<div className="edit-poster__container">
				<div className="edit-poster__header">
					<button onClick={() => navigate(-1)} className="btn-back-icon">
						← Quay lại
					</button>
					<h1>Chỉnh sửa bài viết</h1>
				</div>

				<form onSubmit={handleSubmit} className="edit-poster__form">
					{/* User Info */}
					<div className="edit-poster__user">
						<img 
							src={currentUser?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'} 
							alt={getFullName()} 
						/>
						<div>
							<strong>{getFullName()}</strong>
							<div className="edit-poster__privacy">
								<select 
									value={privacyStatus} 
									onChange={(e) => setPrivacyStatus(e.target.value as any)}
									title="Quyền riêng tư"
								>
									<option value="PUBLIC">🌍 Công khai</option>
									<option value="FRIENDS">👥 Bạn bè</option>
									<option value="PRIVATE">🔒 Chỉ mình tôi</option>
								</select>
							</div>
						</div>
					</div>

					{/* Content */}
					<textarea
						className="edit-poster__textarea"
						placeholder={`${getFullName()} ơi, bạn đang nghĩ gì thế?`}
						value={content}
						onChange={(e) => setContent(e.target.value)}
						rows={8}
					/>

					{/* Image & Video Previews */}
					{previews.length > 0 && (
						<div className="edit-poster__previews">
							{previews.map((preview, index) => (
								<div key={index} className="edit-poster__preview-item">
									{fileTypes[index] === 'video' ? (
										<video 
											src={preview} 
											controls 
											className="edit-poster__preview-video"
										>
											Your browser does not support video.
										</video>
									) : (
										<img src={preview} alt={`Preview ${index + 1}`} />
									)}
									<button
										type="button"
										onClick={() => removeImage(index)}
										className="edit-poster__remove-btn"
										title={fileTypes[index] === 'video' ? 'Xóa video' : 'Xóa ảnh'}
									>
										✕
									</button>
								</div>
							))}
						</div>
					)}

					{/* Error Message */}
					{error && (
						<div className="edit-poster__error-msg">
							⚠️ {error}
						</div>
					)}

					{/* Actions */}
					<div className="edit-poster__actions">
						<div className="edit-poster__add-media">
							<label htmlFor="image-upload" className="edit-poster__media-btn">
								📷 Thêm ảnh/video
							</label>
							<input
								id="image-upload"
								type="file"
								accept="image/*"
								multiple
								onChange={handleImageChange}
								className="edit-poster__file-input"
							/>
							<span className="edit-poster__image-count">
								{images.length}/10 ảnh
							</span>
						</div>
						
						<button 
							type="submit" 
							className="edit-poster__submit"
							disabled={saving || !content.trim()}
						>
							{saving ? '⏳ Đang lưu...' : '💾 Lưu thay đổi'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditPoster;
