# 📤 Share Poster Feature - Frontend Implementation

## ✨ Tổng quan

Tính năng Share Poster đã được triển khai đầy đủ với React + TypeScript, hỗ trợ:
- ✅ Share poster với nội dung riêng
- ✅ Privacy settings (PUBLIC, FRIENDS, PRIVATE)
- ✅ Edit/Delete shares
- ✅ Like shares
- ✅ Comment với nested replies vô hạn
- ✅ Like comments
- ✅ Share feed
- ✅ Share count

---

## 📁 Cấu trúc file

```
src/
├── api/
│   └── poster/
│       └── shareApi.ts          # API client cho tất cả Share endpoints
├── layouts/
│   └── user/
│       └── components/
│           ├── ShareButton.tsx       # Nút Share trên poster
│           ├── ShareButton.css
│           ├── SharePosterCard.tsx   # Card hiển thị bài share
│           ├── SharePosterCard.css
│           ├── SharePosterModal.tsx  # Modal tạo/sửa share
│           ├── SharePosterModal.css
│           ├── ShareFeed.tsx         # Feed hiển thị danh sách shares
│           ├── ShareFeed.css
│           ├── ShareDemo.tsx         # Demo page
│           ├── ShareDemo.css
│           └── index.ts              # Export components
```

---

## 🚀 Cách sử dụng

### 1. Thêm nút Share vào Poster Card

```tsx
import { ShareButton } from './layouts/user/components';

<ShareButton
  posterId="poster-uuid"
  posterContent="Nội dung bài đăng..."
  posterUserName="Tên tác giả"
  posterUserAvatar="https://..."
  posterImages={['url1', 'url2']}
  showCount={true}
  onShareSuccess={() => console.log('Shared!')}
/>
```

### 2. Hiển thị Share Feed

```tsx
import { ShareFeed } from './layouts/user/components';

// Feed của user (xem tất cả shares mà user có quyền xem)
<ShareFeed mode="feed" />

// Shares của một poster cụ thể
<ShareFeed mode="poster" posterId="poster-uuid" />
```

### 3. Hiển thị một Share Card

```tsx
import { SharePosterCard } from './layouts/user/components';

<SharePosterCard
  share={shareData}
  onDeleted={() => console.log('Deleted')}
  onEdit={() => console.log('Edit')}
  onShareUpdated={(updated) => console.log('Updated', updated)}
/>
```

### 4. Modal tạo/sửa Share

```tsx
import { SharePosterModal } from './layouts/user/components';

<SharePosterModal
  isOpen={true}
  onClose={() => setOpen(false)}
  posterInfo={{
    idPoster: 'uuid',
    content: 'Content...',
    userName: 'Author',
    userAvatar: 'url',
    images: ['url1', 'url2']
  }}
  existingShare={existingShare} // Optional: for editing
  onSuccess={() => console.log('Success')}
/>
```

---

## 🧪 Test tính năng

### Demo Page

1. Import và sử dụng ShareDemo component:
```tsx
import { ShareDemo } from './layouts/user/components';

function App() {
  return <ShareDemo />;
}
```

2. Demo page bao gồm:
   - Example poster card với nút Share
   - Share feed để xem tất cả shares
   - Danh sách tính năng
   - Hướng dẫn sử dụng
   - API endpoints reference

---

## 🔧 API Functions

### Share Management
```typescript
import {
  createShare,
  updateShare,
  deleteShare,
  getShareDetails,
  getSharesByUser,
  getSharesByPoster,
  getShareFeed,
  countSharesOfPoster
} from './api/poster/shareApi';
```

### Like Share
```typescript
import {
  likeShare,
  unlikeShare,
  checkIfUserLikedShare,
  getLikeCountShare,
  getUsersWhoLikedShare
} from './api/poster/shareApi';
```

### Comment Share
```typescript
import {
  createShareComment,
  replyToShareComment,
  updateShareComment,
  deleteShareComment,
  getShareComments,
  getShareCommentDetails
} from './api/poster/shareApi';
```

### Like Comment
```typescript
import {
  likeShareComment,
  unlikeShareComment
} from './api/poster/shareApi';
```

---

## 📊 Data Types

### SharePosterDTO
```typescript
interface SharePosterDTO {
  idShare: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  idUser: string;
  userName: string;
  userAvatar?: string;
  privacyStatusName: 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
  originalPoster: {
    idPoster: string;
    content: string;
    userName: string;
    userAvatar?: string;
    images?: string[];
  };
  likeCount: number;
  commentCount: number;
  isLiked?: boolean;
}
```

### ShareCommentDTO
```typescript
interface ShareCommentDTO {
  idCommentShare: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  idUser: string;
  userName: string;
  userAvatar?: string;
  parentCommentId?: string;
  likeCount: number;
  replyCount: number;
  replies?: ShareCommentDTO[];
  isLiked?: boolean;
}
```

---

## 🎨 Styling

Tất cả components đã có CSS riêng với:
- Responsive design (desktop + mobile)
- Smooth animations
- Gradient backgrounds
- Hover effects
- Loading states
- Empty states
- Error states

### Customize Styles

Bạn có thể override CSS trong file riêng:
```css
/* Custom styles */
.share-poster-btn {
  background: linear-gradient(135deg, #your-color-1, #your-color-2);
}

.share-poster-card {
  border-radius: 20px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}
```

---

## ⚙️ Configuration

### API Base URL

Update trong `src/api/API_BASE_URL.ts`:
```typescript
export const API_BASE_URL = 'http://localhost:8085/api';
```

### JWT Token

Đảm bảo user đã đăng nhập và có JWT token trong localStorage:
```typescript
import { getUserId } from './api/util/JwtService';

const userId = getUserId(); // Returns user ID from JWT
```

---

## 🐛 Troubleshooting

### Issue: "No JWT token found"
**Solution:** User chưa đăng nhập. Redirect đến login page.

### Issue: "Failed to fetch"
**Solution:** Kiểm tra:
1. Backend đã chạy chưa? (`http://localhost:8085`)
2. API endpoint đúng chưa?
3. CORS đã được config chưa?

### Issue: Share count không cập nhật
**Solution:** Reload component sau khi share:
```tsx
onShareSuccess={() => {
  loadShareCount();
  // or reload feed
}}
```

---

## 📱 Responsive Design

Components tự động responsive cho:
- Desktop (> 768px)
- Tablet (768px - 1024px)
- Mobile (< 768px)

### Mobile-specific features:
- Touch-friendly buttons
- Optimized image grids
- Collapsible comment threads
- Bottom sheet modals

---

## ♿ Accessibility

- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- High contrast colors
- Focus indicators

---

## 🚀 Next Steps

### Tích hợp vào app

1. **Home Feed:**
```tsx
// src/layouts/TrangChu/HomePage.tsx
import { ShareFeed } from '../user/components';

<ShareFeed mode="feed" />
```

2. **Poster Detail:**
```tsx
// src/layouts/TrangChu/PosterDetail.tsx
import { ShareButton, ShareFeed } from '../user/components';

<ShareButton posterId={poster.id} {...posterInfo} />
<ShareFeed mode="poster" posterId={poster.id} />
```

3. **Profile Page:**
```tsx
// Show user's shares
import { getSharesByUser } from '../api/poster/shareApi';
```

---

## 📝 Notes

- Backend API đã hoàn chỉnh theo document
- Frontend components sẵn sàng sử dụng
- Test kỹ trên cả desktop và mobile
- Đảm bảo JWT token hợp lệ
- Privacy rules được enforce ở backend

---

## 🎉 Ready to Use!

Tất cả components và API đã sẵn sàng. Hãy test thử bằng ShareDemo component! 🚀

```tsx
import { ShareDemo } from './layouts/user/components';

<ShareDemo />
```
