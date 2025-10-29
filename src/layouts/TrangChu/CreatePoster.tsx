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

	// Handle image selection
	const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files) return;

		const fileArray = Array.from(files);
		
		// Limit to 10 images
		if (fileArray.length + images.length > 10) {
			setError('Chỉ được tải lên tối đa 10 ảnh');
			return;
		}

		try {
			// Convert to base64
			const base64Array = await Promise.all(
				fileArray.map(file => fileToBase64(file))
			);

			setImages(prev => [...prev, ...base64Array]);
			setPreviews(prev => [...prev, ...base64Array]);
			setError('');
		} catch (err) {
			console.error('Error converting images:', err);
			setError('Lỗi khi tải ảnh');
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

		if (!currentUser?.id) {
			setError('Bạn cần đăng nhập để tạo bài viết');
			return;
		}

		try {
			setLoading(true);
			setError('');

			const posterData = {
				idUser: currentUser.id,
				content: content.trim(),
				privacyStatusName: privacyStatus,
				imageUrls: images.length > 0 ? images : undefined
			};

			console.log('📤 Creating poster:', posterData);
			
			const response = await createPoster(posterData);
			
			console.log('✅ Poster created:', response);
			
			// Navigate back to home
			navigate('/home');
		} catch (err: any) {
			console.error('❌ Error creating poster:', err);
			setError(err.response?.data || 'Lỗi khi tạo bài viết');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="create-poster">
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

					{/* Image Previews */}
					{previews.length > 0 && (
						<div className="create-poster__previews">
							{previews.map((preview, index) => (
								<div key={index} className="create-poster__preview">
									<img src={preview} alt={`Preview ${index + 1}`} />
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
								accept="image/*"
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
