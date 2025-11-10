import React, { useState, useEffect } from 'react';
import { createShare, updateShare, CreateShareRequest, UpdateShareRequest } from '../../../api/poster/shareApi';
import { getUserId } from '../../../api/util/JwtService';
import './SharePosterModal.css';

interface PosterInfo {
  idPoster: string;
  content: string;
  userName: string;
  userAvatar?: string;
  images?: string[];
}

interface SharePosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  posterInfo: PosterInfo;
  existingShare?: {
    idShare: string;
    content: string;
    privacyStatusName: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  };
  onSuccess?: () => void;
}

const SharePosterModal: React.FC<SharePosterModalProps> = ({
  isOpen,
  onClose,
  posterInfo,
  existingShare,
  onSuccess
}) => {
  const [content, setContent] = useState(existingShare?.content || '');
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'FRIENDS' | 'PRIVATE'>(
    existingShare?.privacyStatusName || 'PUBLIC'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const userId = getUserId();

  useEffect(() => {
    if (existingShare) {
      setContent(existingShare.content);
      setPrivacy(existingShare.privacyStatusName);
    } else {
      setContent('');
      setPrivacy('PUBLIC');
    }
  }, [existingShare]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError('Vui lòng đăng nhập');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (existingShare) {
        // Update existing share
        const request: UpdateShareRequest = {
          userId,
          content: content.trim(),
          privacyStatusName: privacy
        };
        await updateShare(existingShare.idShare, request);
      } else {
        // Create new share
        const request: CreateShareRequest = {
          posterId: posterInfo.idPoster,
          userId,
          content: content.trim(),
          privacyStatusName: privacy
        };
        await createShare(request);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>{existingShare ? 'Chỉnh sửa bài share' : 'Chia sẻ bài đăng'}</h2>
          <button className="share-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="share-modal-form">
          {/* Privacy Selector */}
          <div className="privacy-selector">
            <label htmlFor="privacy-select">Quyền riêng tư:</label>
            <select 
              id="privacy-select" 
              value={privacy} 
              onChange={(e) => setPrivacy(e.target.value as any)}
              title="Chọn quyền riêng tư"
            >
              <option value="PUBLIC">🌍 Công khai</option>
              <option value="FRIENDS">👥 Bạn bè</option>
              <option value="PRIVATE">🔒 Riêng tư</option>
            </select>
          </div>

          {/* Share Content Input */}
          <div className="share-content-input">
            <textarea
              placeholder="Bạn nghĩ gì về bài đăng này?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              maxLength={1000}
            />
            <div className="char-count">{content.length}/1000</div>
          </div>

          {/* Original Poster Preview */}
          <div className="original-poster-preview">
            <div className="preview-header">
              <img 
                src={posterInfo.userAvatar || '/default-avatar.png'} 
                alt={posterInfo.userName}
                className="preview-avatar"
              />
              <span className="preview-username">{posterInfo.userName}</span>
            </div>
            
            <div className="preview-content">
              {posterInfo.content}
            </div>
            
            {posterInfo.images && posterInfo.images.length > 0 && (
              <div className="preview-images">
                {posterInfo.images.slice(0, 3).map((img, idx) => (
                  <img key={idx} src={img} alt="" className="preview-image" />
                ))}
                {posterInfo.images.length > 3 && (
                  <div className="preview-more-images">
                    +{posterInfo.images.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          {error && <div className="share-error-message">{error}</div>}

          {/* Action Buttons */}
          <div className="share-modal-actions">
            <button type="button" onClick={onClose} className="share-cancel-btn" disabled={loading}>
              Hủy
            </button>
            <button type="submit" className="share-submit-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : existingShare ? 'Cập nhật' : 'Chia sẻ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SharePosterModal;
