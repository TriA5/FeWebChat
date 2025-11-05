import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CreatePoster.css';
import { createPoster } from '../../api/poster/posterApi';
import { getUserInfo } from '../../api/user/loginApi';

const CreatePoster: React.FC = () => {
	const navigate = useNavigate();
	const [content, setContent] = useState('');
	const [privacyStatus, setPrivacyStatus] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>('PUBLIC');
	const [images, setImages] = useState<string[]>([]);
	const [previews, setPreviews] = useState<string[]>([]);
	const [fileTypes, setFileTypes] = useState<string[]>([]); // Track if file is image or video
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement | null>(null);

	const currentUser = getUserInfo();

	// Helper function to get full name
	const getFullName = (): string => {
		if (currentUser?.firstName && currentUser?.lastName) {
			return `${currentUser.lastName}`;
		}
		return currentUser?.username || 'Người dùng';
	};

	// Convert file to base64
	const fileToBase64 = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = error => reject(error);
		});
	};

	// Handle image/video selection
	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		const fileArray = Array.from(files);
		
		// Limit to 10 files (images + videos)
		if (fileArray.length + images.length > 10) {
			setError('Chỉ được tải lên tối đa 10 ảnh/video');
			return;
		}

		// Check file sizes (max 10MB for video to avoid upload timeout, 2MB for image)
		for (const file of fileArray) {
			const isVideo = file.type.startsWith('video/');
			const maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024; // 50MB video, 5MB image
			
			if (file.size > maxSize) {
				setError(`${file.name} quá lớn. Video tối đa 50MB, ảnh tối đa 5MB (để tránh lỗi upload)`);
				return;
			}
		}

		try {
			// Convert to base64
			const base64Array = await Promise.all(
				fileArray.map(file => fileToBase64(file))
			);

			// Track file types (image or video)
			const types = fileArray.map(file => file.type.startsWith('video/') ? 'video' : 'image');

			setImages(prev => [...prev, ...base64Array]);
			setPreviews(prev => [...prev, ...base64Array]);
			setFileTypes(prev => [...prev, ...types]);
			setError('');
		} catch (err) {
			console.error('Error converting files:', err);
			setError('Lỗi khi tải ảnh/video');
		}
	};

	// Remove image/video
	const removeImage = (index: number) => {
		setImages(prev => prev.filter((_, i) => i !== index));
		setPreviews(prev => prev.filter((_, i) => i !== index));
		setFileTypes(prev => prev.filter((_, i) => i !== index));
	};

	// Handle submit
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation 1: Content
		if (!content.trim()) {
			setError('❌ Vui lòng nhập nội dung bài viết');
			return;
		}

		// Validation 2: User logged in
		if (!currentUser?.id) {
			setError('❌ Bạn cần đăng nhập để tạo bài viết');
			return;
		}

		// Validation 3: UUID format
		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(currentUser.id)) {
			setError(`❌ User ID không hợp lệ: ${currentUser.id}`);
			console.error('❌ Invalid UUID format:', currentUser.id);
			return;
		}

		// Validation 4: Privacy status
		if (!['PUBLIC', 'FRIENDS', 'PRIVATE'].includes(privacyStatus)) {
			setError(`❌ Privacy status không hợp lệ: ${privacyStatus}`);
			return;
		}

		try {
			setLoading(true);
			setError('');

			// Separate images and videos based on fileTypes
			const imageUrls: string[] = [];
			const videoUrls: string[] = [];
			
			images.forEach((media, index) => {
				if (fileTypes[index] === 'video') {
					videoUrls.push(media);
				} else {
					imageUrls.push(media);
				}
			});

			const posterData: any = {
				idUser: currentUser.id,
				content: content.trim(),
				privacyStatusName: privacyStatus
			};

			// Add imageUrls and videoUrls separately
			if (imageUrls.length > 0) {
				posterData.imageUrls = imageUrls;
			}
			if (videoUrls.length > 0) {
				posterData.videoUrls = videoUrls;
			}

			console.log('📤 Creating poster with data:');
			console.log('  👤 User ID:', currentUser.id);
			console.log('  📝 Content:', content.trim().substring(0, 50) + '...');
			console.log('  🔒 Privacy:', privacyStatus);
			console.log('  📷 Images:', imageUrls.length);
			console.log('  🎬 Videos:', videoUrls.length);
			console.log('  � Payload size:', JSON.stringify(posterData).length, 'bytes');
			console.log('📦 Full payload:', posterData);
			
			const response = await createPoster(posterData);
			
			console.log('✅ Poster created:', response);
			
			// Navigate back to home
			navigate('/home');
		} catch (err: any) {
			console.error('❌ Error creating poster:', err);
			console.error('❌ Response data:', err.response?.data);
			console.error('❌ Response status:', err.response?.status);
			console.error('❌ Response headers:', err.response?.headers);
			
			const errorMessage = err.response?.data?.message || err.response?.data || 'Lỗi khi tạo bài viết';
			setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="create-poster">
			{/* Loading Overlay khi đang đăng */}
			{loading && (
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
							📤 Đang đăng bài viết...
						</p>
					</div>
				</div>
			)}

			<div className="create-poster__container">
				<div className="create-poster__header">
					<button 
						className="create-poster__back"
						onClick={() => navigate('/home')}
						type="button"
					>
						← Quay lại
					</button>
					<h2>Tạo bài viết</h2>
				</div>

				<form onSubmit={handleSubmit} className="create-poster__form">
					{/* User Info */}
					<div className="create-poster__user">
						<img 
							src={currentUser?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80'} 
							alt={getFullName()} 
						/>
						<div>
							<strong>{getFullName()}</strong>
							<div className="create-poster__privacy">
								<select 
									value={privacyStatus} 
									onChange={(e) => setPrivacyStatus(e.target.value as any)}
									aria-label="Quyền riêng tư"
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
						className="create-poster__textarea"
						placeholder={`${getFullName()} ơi, bạn đang nghĩ gì thế?`}
						value={content}
						onChange={(e) => setContent(e.target.value)}
						rows={8}
					/>

					{/* Image/Video Previews */}
					{previews.length > 0 && (
						<div className="create-poster__previews">
							{previews.map((preview, index) => (
								<div key={index} className="create-poster__preview">
									{fileTypes[index] === 'video' ? (
										<video 
											src={preview} 
											controls 
											className="create-poster__preview-video"
										>
											Your browser does not support video.
										</video>
									) : (
										<img src={preview} alt={`Preview ${index + 1}`} />
									)}
									<button
										type="button"
										className="create-poster__remove"
										onClick={() => removeImage(index)}
									>
										✕
									</button>
								</div>
							))}
						</div>
					)}

					{/* Actions */}
					<div className="create-poster__actions">
						<label className="create-poster__action-btn">
							<input
								type="file"
								accept="image/*,video/*"
								multiple
								onChange={handleImageChange}
								className="create-poster__file-input-hidden"
							/>
							📷 Ảnh/video
						</label>
						<button
							type="button"
							className="create-poster__action-btn"
							onClick={() => setShowEmojiPicker(prev => !prev)}
						>
							😊 Cảm xúc
						</button>
						<span className="create-poster__action-btn">📍 Vị trí</span>
					</div>

					{/* Emoji picker popup (simple inline grid) */}
					{showEmojiPicker && (
						<div className="create-poster__emoji-picker" role="dialog" aria-label="Chọn biểu tượng cảm xúc">
							{[
								'😊','😂','😍','👍','🎉','😢','😮','🔥','❤️','🙌','👏','🤔','😴','🤩','😎'
							].map((emoji) => (
								<button
									key={emoji}
									type="button"
									className="create-poster__emoji"
									onClick={() => {
										// insert emoji at cursor
										const ta = textareaRef.current;
										if (!ta) {
											setContent(prev => prev + emoji);
											return;
										}
										const start = ta.selectionStart || 0;
										const end = ta.selectionEnd || 0;
										const newText = content.slice(0, start) + emoji + content.slice(end);
										setContent(newText);
										// move cursor after inserted emoji
										setTimeout(() => {
											ta.focus();
											ta.selectionStart = ta.selectionEnd = start + emoji.length;
										}, 0);
										// keep picker open for multiple picks
									}}
								>
									{emoji}
								</button>
							))}
							<div className="create-poster__emoji-footer">
								<button type="button" className="create-poster__action-btn" onClick={() => setShowEmojiPicker(false)}>Đóng</button>
							</div>
						</div>
					)}

					{/* Error */}
					{error && (
						<div className="create-poster__error">
							❌ {error}
						</div>
					)}

					{/* Submit */}
					<button 
						type="submit" 
						className="create-poster__submit"
						disabled={loading || !content.trim()}
					>
						{loading ? 'Đang đăng...' : 'Đăng bài'}
					</button>
				</form>
			</div>
		</div>
	);
};

export default CreatePoster;
