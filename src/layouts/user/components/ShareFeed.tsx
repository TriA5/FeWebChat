import React, { useState, useEffect } from 'react';
import { SharePosterDTO, getShareFeed, getSharesByPoster } from '../../../api/poster/shareApi';
import { getUserId } from '../../../api/util/JwtService';
import SharePosterCard from './SharePosterCard';
import './ShareFeed.css';

interface ShareFeedProps {
  mode: 'feed' | 'poster'; // feed: show all shares user can see, poster: show shares of specific poster
  posterId?: string; // Required if mode is 'poster'
}

const ShareFeed: React.FC<ShareFeedProps> = ({ mode, posterId }) => {
  const [shares, setShares] = useState<SharePosterDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const currentUserId = getUserId();

  const loadShares = React.useCallback(async () => {
    if (!currentUserId) {
      setError('Vui lòng đăng nhập');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      let data: SharePosterDTO[];
      if (mode === 'feed') {
        data = await getShareFeed(currentUserId);
      } else if (mode === 'poster' && posterId) {
        data = await getSharesByPoster(posterId);
      } else {
        throw new Error('Invalid configuration');
      }

      setShares(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải bài share');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, mode, posterId]);

  useEffect(() => {
    loadShares();
  }, [loadShares]);

  const handleShareDeleted = (shareId: string) => {
    setShares(prev => prev.filter(s => s.idShare !== shareId));
  };

  if (loading) {
    return (
      <div className="share-feed-loading">
        <div className="loading-spinner"></div>
        <div>Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="share-feed-error">
        <div className="error-icon">⚠️</div>
        <div>{error}</div>
        <button onClick={loadShares} className="retry-btn">Thử lại</button>
      </div>
    );
  }

  if (shares.length === 0) {
    return (
      <div className="share-feed-empty">
        <div className="empty-icon">📤</div>
        <div className="empty-title">Chưa có bài share nào</div>
        <div className="empty-subtitle">
          {mode === 'feed' 
            ? 'Hãy là người đầu tiên chia sẻ bài đăng!' 
            : 'Bài đăng này chưa được ai chia sẻ'}
        </div>
      </div>
    );
  }

  return (
    <div className="share-feed">
      {shares.map(share => (
        <SharePosterCard
          key={share.idShare}
          share={share}
          onDeleted={() => handleShareDeleted(share.idShare)}
          onShareUpdated={(updated) => {
            setShares(prev => prev.map(s => 
              s.idShare === updated.idShare ? updated : s
            ));
          }}
        />
      ))}
    </div>
  );
};

export default ShareFeed;
