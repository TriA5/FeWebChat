import React, { useState, useEffect } from 'react';
import { countSharesOfPoster } from '../../../api/poster/shareApi';
import SharePosterModal from './SharePosterModal';
import './ShareButton.css';

interface ShareButtonProps {
  posterId: string;
  posterContent: string;
  posterUserName: string;
  posterUserAvatar?: string;
  posterImages?: string[];
  onShareSuccess?: () => void;
  showCount?: boolean; // Show share count next to button
}

const ShareButton: React.FC<ShareButtonProps> = ({
  posterId,
  posterContent,
  posterUserName,
  posterUserAvatar,
  posterImages,
  onShareSuccess,
  showCount = true
}) => {
  const [showModal, setShowModal] = useState(false);
  const [shareCount, setShareCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadShareCount = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await countSharesOfPoster(posterId);
      setShareCount(data.shareCount);
    } catch (err) {
      console.error('Error loading share count:', err);
    } finally {
      setLoading(false);
    }
  }, [posterId]);

  useEffect(() => {
    if (showCount) {
      loadShareCount();
    }
  }, [showCount, loadShareCount]);

  const handleShareClick = () => {
    setShowModal(true);
  };

  const handleShareSuccess = () => {
    setShareCount(prev => prev + 1);
    onShareSuccess?.();
  };

  return (
    <>
      <button 
        className="share-poster-btn" 
        onClick={handleShareClick}
        disabled={loading}
      >
        <span className="share-icon">📤</span>
        {showCount && shareCount > 0 && (
          <span className="share-count">{shareCount}</span>
        )}
      </button>

      <SharePosterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        posterInfo={{
          idPoster: posterId,
          content: posterContent,
          userName: posterUserName,
          userAvatar: posterUserAvatar,
          images: posterImages
        }}
        onSuccess={handleShareSuccess}
      />
    </>
  );
};

export default ShareButton;
