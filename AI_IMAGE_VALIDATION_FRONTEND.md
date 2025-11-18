# Hướng dẫn triển khai AI Image Validation - Frontend

## 📋 Tổng quan
Hệ thống kiểm tra nội dung ảnh nhạy cảm sử dụng AI đã được tích hợp vào frontend. Khi backend phát hiện ảnh có nội dung không phù hợp, frontend sẽ tự động xử lý hiển thị theo 3 mức độ.

## 🎯 Cách hoạt động

### Backend → Frontend Flow
1. **User gửi ảnh** → Backend nhận ảnh
2. **Backend gọi AI service** → Kiểm tra nội dung (base64)
3. **AI trả về kết quả** với các trường:
   ```json
   {
     "is_sexy": true,
     "sexy_score": 0.9997,
     "porn_score": 0.0001,
     "hentai_score": 0.00003,
     "top_label": "sexy",
     "message": "Ảnh có nội dung nhạy cảm",
     "confidence": 0.9997
   }
   ```
4. **Backend upload** ảnh lên Cloudinary (vẫn lưu)
5. **Backend gửi qua WebSocket** → `/topic/chat/{conversationId}` hoặc `/topic/group/{groupId}`
6. **Frontend nhận message** với validation info
7. **Frontend xử lý** → Hiển thị theo mức độ

## 🔧 Các thay đổi trong Code

### 1. Cập nhật Interface (`chatApi.ts`)
```typescript
export interface ChatMessageDTO {
  // ... existing fields
  isSexy?: boolean;
  sexyScore?: number;
  pornScore?: number;
  hentaiScore?: number;
  topLabel?: string;
  validationMessage?: string;
  confidence?: number;
}
```

### 2. Cập nhật Message Interface (`Chat.tsx`)
```typescript
interface Message {
  // ... existing fields
  isSexy?: boolean;
  sexyScore?: number;
  pornScore?: number;
  hentaiScore?: number;
  topLabel?: string;
  validationMessage?: string;
  confidence?: number;
}
```

### 3. State Management
```typescript
// Track which images user has revealed
const [revealedImages, setRevealedImages] = useState<Set<string>>(new Set());

// User preference to always show sensitive content
const [alwaysShowSensitiveContent, setAlwaysShowSensitiveContent] = useState(() => {
  return localStorage.getItem('alwaysShowSensitiveContent') === 'true';
});
```

### 4. Helper Functions
```typescript
// Chặn hoàn toàn (score > 0.95)
const shouldBlockImage = (message: Message): boolean => {
  return message.isSexy === true && (message.sexyScore || 0) > 0.95;
};

// Blur ảnh (0.7 < score <= 0.95)
const shouldBlurImage = (message: Message): boolean => {
  return message.isSexy === true && 
         (message.sexyScore || 0) > 0.7 && 
         (message.sexyScore || 0) <= 0.95;
};

// Hiển thị warning badge
const shouldShowWarning = (message: Message): boolean => {
  return message.isSexy === true;
};
```

### 5. WebSocket Handler Updates
```typescript
// Private chat subscription
wsSubscribe(`/topic/chat/${conversationId}`, (msg) => {
  const data = JSON.parse(msg.body);
  
  // Log warning for sensitive images
  if (data.messageType === 'IMAGE' && data.isSexy) {
    console.warn('⚠️ Ảnh nhạy cảm:', data.validationMessage);
    console.log('📊 Sexy score:', data.sexyScore);
    console.log('🏷️ Top label:', data.topLabel);
  }
  
  const incoming: Message = {
    // ... existing fields
    isSexy: data.isSexy,
    sexyScore: data.sexyScore,
    pornScore: data.pornScore,
    hentaiScore: data.hentaiScore,
    topLabel: data.topLabel,
    validationMessage: data.validationMessage,
    confidence: data.confidence,
  };
});
```

## 🎨 UI/UX Features

### 1. **Chặn hoàn toàn (Score > 95%)**
```jsx
<div className="blocked-image-container">
  <div className="blocked-image-icon">🚫</div>
  <div className="blocked-image-text">
    <strong>Ảnh vi phạm chính sách</strong>
    <p>Nội dung không phù hợp (Score: 99.7%)</p>
  </div>
</div>
```
- **Hiển thị**: Icon cảnh báo + Thông báo
- **Không cho phép**: Xem ảnh
- **Nguyên nhân**: Score quá cao (> 95%)

### 2. **Blur + Click to Reveal (70% < Score <= 95%)**
```jsx
<div className="sensitive-image-container">
  <div className="sensitive-warning-badge">
    ⚠️ Nội dung nhạy cảm
    <span className="warning-score">sexy (99%)</span>
  </div>
  <div className="blurred-image-wrapper">
    <img className="message-image blurred" src={imageUrl} />
    <div className="reveal-overlay">
      <button className="reveal-btn" onClick={revealImage}>
        👁️ Nhấn để xem ảnh
      </button>
      <div className="warning-text">
        Ảnh có nội dung nhạy cảm
      </div>
    </div>
  </div>
</div>
```
- **Hiển thị**: Ảnh bị blur 20px + Overlay
- **Warning badge**: Hiển thị ở góc trên trái
- **Click to reveal**: User phải nhấn nút để xem
- **Lưu trạng thái**: Sau khi reveal, ảnh không bị blur nữa

### 3. **Light Warning (Score < 70%)**
```jsx
<div className="normal-image-container">
  <div className="sensitive-warning-badge light">
    ⚠️ Nội dung nhạy cảm
    <span className="warning-score">sexy</span>
  </div>
  <img 
    className="message-image light-blur" 
    src={imageUrl}
    onClick={revealImage}
  />
</div>
```
- **Hiển thị**: Ảnh blur nhẹ (8px)
- **Warning badge**: Màu vàng (không nghiêm trọng)
- **Click to reveal**: Click để xem rõ hơn

## 🎭 CSS Classes

### Blocked Image
- `.blocked-image-container` - Container chính
- `.blocked-image-icon` - Icon cảnh báo với animation pulse
- `.blocked-image-text` - Text thông báo

### Sensitive Image
- `.sensitive-image-container` - Container cho ảnh nhạy cảm
- `.sensitive-warning-badge` - Badge cảnh báo (đỏ)
- `.sensitive-warning-badge.light` - Badge cảnh báo nhẹ (vàng)
- `.blurred-image-wrapper` - Wrapper cho ảnh blur
- `.message-image.blurred` - Ảnh bị blur 20px
- `.message-image.light-blur` - Ảnh bị blur nhẹ 8px

### Reveal Controls
- `.reveal-overlay` - Overlay đen mờ trên ảnh blur
- `.reveal-btn` - Nút "Nhấn để xem ảnh"
- `.warning-text` - Text cảnh báo dưới nút

## 📱 Responsive Design
```css
@media (max-width: 768px) {
  .blocked-image-container {
    min-width: 200px;
    min-height: 150px;
  }
  .sensitive-warning-badge {
    font-size: 0.75rem;
    padding: 4px 8px;
  }
  .reveal-btn {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
}
```

## ⚙️ User Settings (Optional)

### Tùy chọn "Luôn hiển thị nội dung nhạy cảm"
```typescript
const toggleAlwaysShow = () => {
  const newValue = !alwaysShowSensitiveContent;
  setAlwaysShowSensitiveContent(newValue);
  localStorage.setItem('alwaysShowSensitiveContent', String(newValue));
};
```

### UI Component (có thể thêm vào Settings)
```jsx
<div className="sensitive-content-settings">
  <label>
    <input 
      type="checkbox"
      checked={alwaysShowSensitiveContent}
      onChange={toggleAlwaysShow}
    />
    Luôn hiển thị nội dung nhạy cảm
  </label>
</div>
```

## 🔍 Testing

### Test Case 1: High Score Image (> 95%)
```javascript
// Giả lập message với score cao
const testMessage = {
  id: '1',
  type: 'image',
  imageUrl: 'https://example.com/image.jpg',
  isSexy: true,
  sexyScore: 0.997,
  topLabel: 'sexy',
  validationMessage: 'Ảnh có nội dung nhạy cảm',
  confidence: 0.997
};
// Kỳ vọng: Hiển thị blocked container
```

### Test Case 2: Medium Score Image (70-95%)
```javascript
const testMessage = {
  id: '2',
  type: 'image',
  imageUrl: 'https://example.com/image.jpg',
  isSexy: true,
  sexyScore: 0.85,
  topLabel: 'sexy',
  validationMessage: 'Ảnh có nội dung nhạy cảm',
  confidence: 0.85
};
// Kỳ vọng: Hiển thị blurred image + reveal button
```

### Test Case 3: Low Score Image (< 70%)
```javascript
const testMessage = {
  id: '3',
  type: 'image',
  imageUrl: 'https://example.com/image.jpg',
  isSexy: true,
  sexyScore: 0.65,
  topLabel: 'sexy',
  validationMessage: 'Ảnh có nội dung nhạy cảm',
  confidence: 0.65
};
// Kỳ vọng: Hiển thị light blur + yellow warning badge
```

### Test Case 4: Normal Image
```javascript
const testMessage = {
  id: '4',
  type: 'image',
  imageUrl: 'https://example.com/image.jpg',
  isSexy: false
};
// Kỳ vọng: Hiển thị ảnh bình thường
```

## 📊 Logging

Console logs tự động khi phát hiện ảnh nhạy cảm:
```
⚠️ Ảnh nhạy cảm: Ảnh có nội dung nhạy cảm (sexy/porn/hentai)
📊 Sexy score: 0.9997
🏷️ Top label: sexy
```

## 🚀 Files Modified

1. **`src/api/chat/chatApi.ts`** - Added AI validation fields to ChatMessageDTO
2. **`src/layouts/user/Chat.tsx`** - Updated Message interface, state management, helpers, rendering logic
3. **`src/layouts/user/SensitiveContent.css`** - New CSS file for sensitive content styles
4. **WebSocket handlers** - Updated to include validation data in private & group chats
5. **Message loading functions** - Updated to transform and include validation fields

## 📝 Notes

- **Ảnh vẫn được lưu trữ**: Backend vẫn upload lên Cloudinary bình thường
- **Client-side filtering**: Frontend quyết định cách hiển thị dựa trên score
- **User control**: User có thể reveal ảnh nếu muốn (trừ blocked images)
- **Persistent state**: Trạng thái revealed được lưu trong session (revealedImages Set)
- **LocalStorage preference**: Setting "always show" được lưu vĩnh viễn

## ⚡ Performance

- **Không ảnh hưởng tốc độ**: Chỉ thêm logic kiểm tra đơn giản
- **CSS blur**: Sử dụng filter blur native của browser
- **Lazy evaluation**: Chỉ check khi render image messages
- **Minimal re-renders**: State được quản lý hiệu quả với Set và localStorage

## 🔐 Security

- **Backend validation**: AI validation chỉ chạy ở backend
- **Frontend là UI layer**: Chỉ hiển thị kết quả từ backend
- **Không thể bypass**: User không thể tắt validation (chỉ có thể reveal)
- **Audit trail**: Console logs ghi lại tất cả sensitive images

## 🎉 Completion Status

✅ ChatMessageDTO interface updated  
✅ Message interface updated  
✅ State management added  
✅ WebSocket handlers updated  
✅ Image rendering logic implemented  
✅ CSS styles created  
✅ Helper functions added  
✅ Console logging implemented  

**Implementation Complete! Ready for testing with backend AI service.**
