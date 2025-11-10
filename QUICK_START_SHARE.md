# 🚀 Quick Start - Share Poster Feature

## ⚡ Bắt đầu nhanh trong 3 bước

### Bước 1: Import components
```tsx
import { ShareButton, ShareFeed, ShareDemo } from './layouts/user/components';
```

### Bước 2: Test với Demo
```tsx
// App.tsx hoặc Route config
import { ShareDemo } from './layouts/user/components';

function TestShareFeature() {
  return <ShareDemo />;
}
```

### Bước 3: Tích hợp vào Poster
```tsx
// Thêm vào PosterCard component
import { ShareButton } from './layouts/user/components';

<ShareButton
  posterId={poster.id}
  posterContent={poster.content}
  posterUserName={poster.userName}
  posterUserAvatar={poster.avatar}
  posterImages={poster.images}
/>
```

---

## 🎯 Use Cases phổ biến

### 1. Thêm nút Share vào Home Feed
```tsx
// HomePage.tsx
import { ShareButton } from './layouts/user/components';

{posters.map(poster => (
  <div key={poster.id} className="poster-card">
    {/* Poster content */}
    <div className="poster-actions">
      <button>Like</button>
      <button>Comment</button>
      <ShareButton
        posterId={poster.id}
        posterContent={poster.content}
        posterUserName={poster.userName}
        posterUserAvatar={poster.avatar}
        posterImages={poster.images}
      />
    </div>
  </div>
))}
```

### 2. Hiển thị Share Feed
```tsx
// ShareFeedPage.tsx
import { ShareFeed } from './layouts/user/components';

function ShareFeedPage() {
  return (
    <div className="feed-container">
      <h1>Bài viết được chia sẻ</h1>
      <ShareFeed mode="feed" />
    </div>
  );
}
```

### 3. Xem Shares của một Poster
```tsx
// PosterDetailPage.tsx
import { ShareFeed } from './layouts/user/components';

function PosterDetailPage({ posterId }: { posterId: string }) {
  return (
    <div>
      {/* Poster details */}
      
      <h2>Người dùng đã chia sẻ</h2>
      <ShareFeed mode="poster" posterId={posterId} />
    </div>
  );
}
```

### 4. Manual Share với Modal
```tsx
import { useState } from 'react';
import { SharePosterModal } from './layouts/user/components';

function CustomShareButton({ poster }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button onClick={() => setShowModal(true)}>
        Custom Share Button
      </button>

      <SharePosterModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        posterInfo={{
          idPoster: poster.id,
          content: poster.content,
          userName: poster.userName,
          userAvatar: poster.avatar,
          images: poster.images
        }}
        onSuccess={() => {
          console.log('Shared successfully!');
          setShowModal(false);
        }}
      />
    </>
  );
}
```

---

## 🔌 API Usage Examples

### Tạo Share
```typescript
import { createShare } from './api/poster/shareApi';
import { getUserId } from './api/util/JwtService';

const handleShare = async () => {
  const userId = getUserId();
  if (!userId) return;

  const share = await createShare({
    posterId: 'poster-uuid',
    userId: userId,
    content: 'My thoughts on this post...',
    privacyStatusName: 'PUBLIC'
  });

  console.log('Share created:', share);
};
```

### Load Shares
```typescript
import { getShareFeed, getSharesByPoster } from './api/poster/shareApi';
import { getUserId } from './api/util/JwtService';

// Get feed
const userId = getUserId();
const myFeed = await getShareFeed(userId);

// Get shares of a poster
const shares = await getSharesByPoster('poster-uuid');
```

### Like Share
```typescript
import { likeShare, unlikeShare } from './api/poster/shareApi';
import { getUserId } from './api/util/JwtService';

const userId = getUserId();

// Like
await likeShare('share-uuid', { userId });

// Unlike
await unlikeShare('share-uuid', userId);
```

### Comment
```typescript
import { createShareComment, replyToShareComment } from './api/poster/shareApi';
import { getUserId } from './api/util/JwtService';

const userId = getUserId();

// Create comment
const comment = await createShareComment('share-uuid', {
  userId,
  content: 'Great share!'
});

// Reply to comment
const reply = await replyToShareComment('comment-uuid', {
  userId,
  content: 'I agree!'
});
```

---

## 🎨 Customization

### Custom Styling
```css
/* CustomShare.css */
.share-poster-btn {
  background: linear-gradient(135deg, #your-color, #your-color);
  border-radius: 20px;
  padding: 12px 24px;
}

.share-poster-card {
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  border-radius: 16px;
}
```

### Custom Privacy Options
```tsx
// Edit SharePosterModal.tsx
<select ...>
  <option value="PUBLIC">Everyone</option>
  <option value="FRIENDS">Friends Only</option>
  <option value="PRIVATE">Only Me</option>
  <option value="CUSTOM">Custom...</option> {/* Add new option */}
</select>
```

---

## 🧪 Testing Checklist

- [ ] Click Share button → Modal opens
- [ ] Type content → Character count updates
- [ ] Select privacy → Option changes
- [ ] Click "Chia sẻ" → Share created
- [ ] Share appears in feed
- [ ] Like share → Count increases
- [ ] Comment on share → Comment appears
- [ ] Reply to comment → Nested reply shows
- [ ] Edit share → Content updates
- [ ] Delete share → Removed from feed
- [ ] Privacy PRIVATE → Only owner sees
- [ ] Privacy FRIENDS → Only friends see
- [ ] Privacy PUBLIC → Everyone sees

---

## ⚠️ Common Issues

### Issue: "No JWT token found"
```tsx
// Check login status first
import { getUserId } from './api/util/JwtService';

const userId = getUserId();
if (!userId) {
  // Redirect to login
  navigate('/login');
}
```

### Issue: API returns 404
```typescript
// Check API base URL
import { API_BASE_URL } from './api/API_BASE_URL';
console.log('API URL:', API_BASE_URL); // Should be http://localhost:8085/api
```

### Issue: CORS error
```java
// Backend: Add CORS config
@CrossOrigin(origins = "http://localhost:3000")
@RestController
public class SharePosterController { ... }
```

---

## 📱 Routing Setup

```tsx
// App.tsx or Router config
import { ShareDemo, ShareFeed } from './layouts/user/components';

<Routes>
  <Route path="/share/demo" element={<ShareDemo />} />
  <Route path="/share/feed" element={<ShareFeed mode="feed" />} />
  <Route path="/poster/:id/shares" element={
    <ShareFeed mode="poster" posterId={useParams().id} />
  } />
</Routes>
```

---

## 🎉 You're Ready!

Tất cả setup đã xong. Start server và test thử:

```bash
# Terminal 1: Backend
cd poster-service
./mvnw spring-boot:run

# Terminal 2: Frontend
cd chatwebfe
npm start

# Open browser
http://localhost:3000/share/demo
```

Happy coding! 🚀
