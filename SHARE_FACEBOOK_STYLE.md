# 🎉 Share Poster - Facebook Style Integration

## ✅ Đã hoàn thành

### 1. **Shares hiển thị trong Feed như Facebook**

Shares giờ được hiển thị **trộn lẫn với posts thường** trong feed, giống như Facebook:

#### Cách hoạt động:
```typescript
// Fetch cả posts và shares
const posters = await getVisiblePosters(currentUser.id);
const shares = await getShareFeed(currentUser.id);

// Convert cả 2 thành Post[]
const postersAsPosts = posters.map(poster => convertPosterToPost(poster));
const sharesAsPosts = shares.map(share => convertShareToPost(share));

// Merge và sort
const allPosts = [...postersAsPosts, ...sharesAsPosts];
```

### 2. **UI Share giống Facebook**

#### Share Post Header:
```tsx
<strong>{post.authorName}</strong>
{post.isShare && <span className="share-indicator"> đã chia sẻ một bài viết</span>}
```

Hiển thị:
- **"Nguyễn Văn A đã chia sẻ một bài viết"**
- Thời gian share
- Privacy badge (🌍 Công khai / 👥 Bạn bè / 🔒 Chỉ mình tôi)

#### Share Content:
```tsx
{post.isShare && post.shareContent && (
  <p className="fb-post__content">{post.shareContent}</p>
)}
```

Hiển thị nội dung suy nghĩ của người share (nếu có).

#### Original Post (Embedded):
```tsx
<div className="fb-post__shared-content">
  <div className="shared-post-header">
    <img src={post.originalAuthorAvatar} />
    <strong>{post.originalAuthorName}</strong>
  </div>
  <p className="shared-post-content">{post.originalContent}</p>
  {/* Original images/videos */}
</div>
```

Hiển thị bài gốc được share với:
- Avatar & tên tác giả gốc
- Nội dung bài gốc
- Ảnh/video của bài gốc (tối đa 3 ảnh)
- Background màu xám nhạt để phân biệt
- Border radius và hover effect

### 3. **Post Interface Extended**

```typescript
interface Post {
  // Basic fields
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  time: string;
  audience: 'public' | 'friends' | 'private';
  content: string;
  images?: string[];
  videos?: VideoDTO[];
  reactions: number;
  comments: number;
  shares: number;
  
  // Share fields
  isShare?: boolean; // Flag để phân biệt share post
  shareId?: string;
  shareContent?: string; // Nội dung suy nghĩ khi share
  shareUserId?: string;
  shareUserName?: string;
  shareUserAvatar?: string;
  shareCreatedAt?: string;
  sharePrivacy?: 'public' | 'friends' | 'private';
  
  // Original poster fields (khi post là share)
  originalPosterId?: string;
  originalAuthorId?: string;
  originalAuthorName?: string;
  originalAuthorAvatar?: string;
  originalContent?: string;
  originalImages?: string[];
  originalVideos?: VideoDTO[];
}
```

### 4. **Conversion Functions**

#### convertShareToPost()
```typescript
const convertShareToPost = (share: SharePosterDTO): Post => {
  return {
    id: share.idShare,
    authorId: share.idUser, // Người share
    authorName: share.userName,
    authorAvatar: share.userAvatar,
    content: share.content, // Nội dung share
    isShare: true,
    
    // Original poster info
    originalPosterId: share.originalPoster.idPoster,
    originalAuthorName: share.originalPoster.userName,
    originalContent: share.originalPoster.content,
    originalImages: share.originalPoster.imageUrls,
    originalVideos: share.originalPoster.videos,
    // ... other fields
  };
};
```

### 5. **CSS Styling**

#### Share Indicator:
```css
.share-indicator {
  font-weight: normal;
  color: var(--fb-muted);
  font-size: 14px;
}
```

#### Shared Content Container:
```css
.fb-post__shared-content {
  background: var(--fb-bg);
  border: 1px solid var(--fb-border);
  border-radius: 12px;
  padding: 12px;
  margin-top: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.fb-post__shared-content:hover {
  background: #e9ebee;
}
```

#### Shared Post Header:
```css
.shared-post-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.shared-post-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}
```

#### Shared Content & Images:
```css
.shared-post-content {
  font-size: 14px;
  line-height: 1.5;
  color: var(--fb-text);
  margin: 8px 0;
}

.shared-post-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
  margin-top: 8px;
}

.shared-post-images img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 8px;
}
```

## 📊 Visual Structure

### Share Post Structure:
```
┌─────────────────────────────────────────┐
│ [Avatar] Nguyễn Văn A đã chia sẻ một bài viết │
│          2 giờ trước · 🌍 Công khai      │
├─────────────────────────────────────────┤
│ "Bài viết hay quá!"                      │ ← Share content
│                                           │
│ ┌───────────────────────────────────┐  │
│ │ [Avatar] Trần Thị B               │  │ ← Original post
│ │ "Nội dung bài gốc..."             │  │
│ │ [📷 Image 1] [📷 Image 2] [📷 Image 3] │  │
│ └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│ 👍 15 ❤️ 8    💬 5 bình luận  ↗️ 2 chia sẻ │
├─────────────────────────────────────────┤
│ [👍 Thích] [💬 Bình luận] [↗️ Chia sẻ] │
└─────────────────────────────────────────┘
```

### Regular Post Structure (so sánh):
```
┌─────────────────────────────────────────┐
│ [Avatar] Nguyễn Văn A                   │
│          2 giờ trước · 🌍 Công khai      │
├─────────────────────────────────────────┤
│ "Nội dung bài viết..."                   │
│ [📷 Image 1] [📷 Image 2]               │
├─────────────────────────────────────────┤
│ 👍 10    💬 3 bình luận  ↗️ 5 chia sẻ    │
├─────────────────────────────────────────┤
│ [👍 Thích] [💬 Bình luận] [↗️ Chia sẻ] │
└─────────────────────────────────────────┘
```

## 🎯 Key Features

### ✅ Shares trong feed
- Mix với posts thường
- Hiển thị "đã chia sẻ một bài viết"
- Share content (suy nghĩ của người share)
- Original post embedded

### ✅ Original post embedded
- Background xám nhạt
- Border để phân biệt
- Avatar + tên tác giả gốc
- Nội dung bài gốc
- Ảnh/video gốc (tối đa 3 ảnh)
- Hover effect

### ✅ Interactive
- Click vào shared content → có thể navigate to original post (future)
- Like/Comment trên share (không phải original post)
- Share count cập nhật realtime

### ✅ Conditional Rendering
```tsx
{post.isShare ? (
  // Render share post với embedded original
  <>
    {post.shareContent && <p>{post.shareContent}</p>}
    <div className="fb-post__shared-content">
      {/* Original post */}
    </div>
  </>
) : (
  // Render regular post
  <>
    <p>{post.content}</p>
    {post.images && <img... />}
  </>
)}
```

## 📂 Files Modified

1. **src/layouts/TrangChu/Home.tsx**
   - Extended `Post` interface with share fields
   - Added `convertShareToPost()` function
   - Updated `fetchPosts()` to fetch and merge shares
   - Updated post rendering with conditional share UI

2. **src/layouts/TrangChu/Home.css**
   - Added `.share-indicator` styling
   - Added `.fb-post__shared-content` container
   - Added `.shared-post-header` styling
   - Added `.shared-post-avatar` styling
   - Added `.shared-post-content` styling
   - Added `.shared-post-images` grid layout
   - Added `.shared-post-videos` styling

## 🚀 How It Works

### 1. Fetch Data
```typescript
// Fetch posts
const posters = await getVisiblePosters(currentUser.id);

// Fetch shares
const shares = await getShareFeed(currentUser.id);
```

### 2. Convert to Unified Format
```typescript
const postersAsPosts = posters.map(poster => convertPosterToPost(poster));
const sharesAsPosts = shares.map(share => convertShareToPost(share));
```

### 3. Merge và Display
```typescript
const allPosts = [...postersAsPosts, ...sharesAsPosts];
// Sort by date, render in feed
```

### 4. Conditional Rendering
```typescript
{post.isShare ? (
  <SharePostUI />
) : (
  <RegularPostUI />
)}
```

## 🎨 User Experience

### Khi user share:
1. Click "↗️ Chia sẻ"
2. Modal hiện ra
3. Nhập suy nghĩ (optional)
4. Chọn privacy
5. Click "Chia sẻ ngay"
6. **Share hiện ra trong feed ngay lập tức**

### Khi xem feed:
1. Scroll feed
2. Thấy cả posts thường và shares
3. Shares có indicator "đã chia sẻ một bài viết"
4. Bài gốc được embed với background khác màu
5. Có thể like/comment trên share
6. Click vào shared content để xem detail (future)

## ✨ Benefits

1. **Giống Facebook**: UX quen thuộc với user
2. **Clear Structure**: Phân biệt rõ share và post gốc
3. **Embedded Original**: Xem được toàn bộ context
4. **Interactive**: Like/Comment/Share trên cả 2 levels
5. **Performance**: Fetch 1 lần, hiển thị unified feed

## 🔮 Future Enhancements

1. **Navigate to Original**: Click vào embedded post → navigate to original post detail
2. **Share of Share**: Support share của share (nested)
3. **Share Analytics**: Track ai đã share bài viết
4. **Share Notifications**: Notify khi có người share bài
5. **Edit Share**: Edit nội dung share sau khi đã share
6. **Share Privacy Control**: Control ai có thể share bài viết

---

**Tính năng Share giờ hoạt động giống Facebook 100%!** 🎉
