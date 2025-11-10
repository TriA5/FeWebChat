import React, { useState } from 'react';
import ShareButton from './ShareButton';
import ShareFeed from './ShareFeed';
import './ShareDemo.css';

const ShareDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'feed' | 'example'>('example');

  // Example poster data
  const examplePoster = {
    idPoster: '123e4567-e89b-12d3-a456-426614174000',
    content: 'Đây là một bài đăng mẫu để test tính năng Share Poster! 🎉\n\nBạn có thể:\n✅ Share bài này với nội dung riêng\n✅ Chọn quyền riêng tư (Public/Friends/Private)\n✅ Like và comment trên bài share\n✅ Xem tất cả shares trong Feed',
    userName: 'Demo User',
    userAvatar: 'https://i.pravatar.cc/150?img=1',
    images: [
      'https://picsum.photos/400/300?random=1',
      'https://picsum.photos/400/300?random=2',
      'https://picsum.photos/400/300?random=3',
    ]
  };

  return (
    <div className="share-demo-container">
      <div className="share-demo-header">
        <h1>📤 Share Poster Feature Demo</h1>
        <p>Test tính năng chia sẻ bài đăng với đầy đủ chức năng</p>
      </div>

      {/* Tabs */}
      <div className="share-demo-tabs">
        <button 
          className={`tab-btn ${activeTab === 'example' ? 'active' : ''}`}
          onClick={() => setActiveTab('example')}
        >
          📝 Example Poster
        </button>
        <button 
          className={`tab-btn ${activeTab === 'feed' ? 'active' : ''}`}
          onClick={() => setActiveTab('feed')}
        >
          📰 Share Feed
        </button>
      </div>

      {/* Content */}
      <div className="share-demo-content">
        {activeTab === 'example' && (
          <div className="example-section">
            <div className="feature-list">
              <h3>✨ Tính năng đã hoàn thành:</h3>
              <ul>
                <li>✅ <strong>Share Poster</strong> - Chia sẻ bài đăng với nội dung riêng</li>
                <li>✅ <strong>Privacy Settings</strong> - PUBLIC / FRIENDS / PRIVATE</li>
                <li>✅ <strong>Edit/Delete Share</strong> - Chỉnh sửa và xóa bài share</li>
                <li>✅ <strong>Like Share</strong> - Thích bài share</li>
                <li>✅ <strong>Comment Share</strong> - Bình luận với nested replies vô hạn</li>
                <li>✅ <strong>Like Comment</strong> - Thích bình luận</li>
                <li>✅ <strong>Share Feed</strong> - Xem tất cả bài share</li>
                <li>✅ <strong>Share Count</strong> - Đếm số lượt share</li>
              </ul>
            </div>

            {/* Example Poster Card */}
            <div className="example-poster-card">
              <div className="poster-header">
                <img src={examplePoster.userAvatar} alt={examplePoster.userName} className="poster-avatar" />
                <div className="poster-info">
                  <div className="poster-username">{examplePoster.userName}</div>
                  <div className="poster-timestamp">2 giờ trước • 🌍 Công khai</div>
                </div>
              </div>

              <div className="poster-content">
                {examplePoster.content}
              </div>

              {examplePoster.images && examplePoster.images.length > 0 && (
                <div className="poster-images">
                  {examplePoster.images.map((img, idx) => (
                    <img key={idx} src={img} alt="" className="poster-image" />
                  ))}
                </div>
              )}

              <div className="poster-actions">
                <button className="action-btn">
                  <span>❤️</span> <span>Like</span>
                </button>
                <button className="action-btn">
                  <span>💬</span> <span>Comment</span>
                </button>
                <ShareButton
                  posterId={examplePoster.idPoster}
                  posterContent={examplePoster.content}
                  posterUserName={examplePoster.userName}
                  posterUserAvatar={examplePoster.userAvatar}
                  posterImages={examplePoster.images}
                  showCount={true}
                />
              </div>
            </div>

            <div className="usage-guide">
              <h3>🎯 Hướng dẫn sử dụng:</h3>
              <ol>
                <li>Click nút <strong>"📤 Share"</strong> trên poster card</li>
                <li>Viết nội dung chia sẻ của bạn (tùy chọn)</li>
                <li>Chọn quyền riêng tư (Public/Friends/Private)</li>
                <li>Click <strong>"Chia sẻ"</strong> để đăng</li>
                <li>Xem bài share trong tab <strong>"Share Feed"</strong></li>
                <li>Like, comment, và tương tác với bài share</li>
              </ol>
            </div>
          </div>
        )}

        {activeTab === 'feed' && (
          <div className="feed-section">
            <div className="feed-header">
              <h2>📰 Share Feed</h2>
              <p>Tất cả bài share mà bạn có thể xem</p>
            </div>
            <ShareFeed mode="feed" />
          </div>
        )}
      </div>

      {/* API Info */}
      <div className="api-info">
        <h3>🔗 API Endpoints:</h3>
        <div className="api-list">
          <div className="api-item">
            <span className="api-method post">POST</span>
            <code>/api/shares</code>
            <span className="api-desc">Create share</span>
          </div>
          <div className="api-item">
            <span className="api-method put">PUT</span>
            <code>/api/shares/{'{shareId}'}</code>
            <span className="api-desc">Update share</span>
          </div>
          <div className="api-item">
            <span className="api-method delete">DELETE</span>
            <code>/api/shares/{'{shareId}'}</code>
            <span className="api-desc">Delete share</span>
          </div>
          <div className="api-item">
            <span className="api-method get">GET</span>
            <code>/api/shares/feed/{'{viewerId}'}</code>
            <span className="api-desc">Get feed</span>
          </div>
          <div className="api-item">
            <span className="api-method post">POST</span>
            <code>/api/shares/{'{shareId}'}/like</code>
            <span className="api-desc">Like share</span>
          </div>
          <div className="api-item">
            <span className="api-method post">POST</span>
            <code>/api/shares/{'{shareId}'}/comments</code>
            <span className="api-desc">Comment</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareDemo;
