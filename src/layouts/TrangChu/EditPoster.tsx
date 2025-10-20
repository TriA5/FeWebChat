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
	const [previews, setPreviews] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');

	// Helper function to get full name
	const getFullName = (): string => {
		if (currentUser?.firstName && currentUser?.lastName) {
			return `${currentUser.lastName} ${currentUser.firstName}`;
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
			if (poster.imageUrls) {
				setImages(poster.imageUrls);
				setPreviews(poster.imageUrls);
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

	// Remove image
	const removeImage = (index: number) => {
		setImages(prev => prev.filter((_, i) => i !== index));
		setPreviews(prev => prev.filter((_, i) => i !== index));
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

			await updatePoster(posterId, {
				idUser: currentUser.id,
				content: content.trim(),
				privacyStatusName: privacyStatus,
				imageUrls: images
			});

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

					{/* Image Previews */}
					{previews.length > 0 && (
						<div className="edit-poster__previews">
							{previews.map((preview, index) => (
								<div key={index} className="edit-poster__preview-item">
									<img src={preview} alt={`Preview ${index + 1}`} />
									<button
										type="button"
										onClick={() => removeImage(index)}
										className="edit-poster__remove-btn"
										title="Xóa ảnh"
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
