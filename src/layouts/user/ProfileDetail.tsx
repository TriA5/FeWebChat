import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios"; // still used for initial fetch only
import { useParams } from "react-router-dom";
import {
  Mail,
  Phone,
  Calendar,
  User as UserIcon,
  ShieldCheck,
  Clock,
  Hash,
  Edit,
  Save,
  X,
  Users,
  MessageCircle,
  MoreHorizontal,
  UserPlus,
  Image as ImageIcon,
  Plus,
} from "lucide-react";
import { getUserInfo } from '../../api/user/loginApi';
import { changeAvatar } from '../../api/user/avatarApi';
import { updateUserProfile, UpdateProfileRequest as UpdateProfilePayload } from '../../api/user/profileApi';
import "./ProfileDetail.css";
import Header from "../header-footer/Header";

interface UserDetail {
  idUser: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  avatar: string;
  status: boolean;
  enabled: boolean;
  gender: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileRequest {
  idUser: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: boolean;
}

const ProfileDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<UpdateProfileRequest>({
    idUser: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: true,
  });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  // Avatar change states
  const [isChangingAvatar, setIsChangingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string,string>>({});
  const [toasts, setToasts] = useState<Array<{id:number; type:'success'|'error'; text:string}>>([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      try {
        const res = await axios.get<UserDetail>(
          `http://localhost:8080/users/search/findByIdUser?IdUser=${id}`
          
        );
        setUser(res.data);
        
        // Check if this is current user's profile
        const currentUser = getUserInfo();
        const isOwn = currentUser?.id === id;
        setIsOwnProfile(isOwn);
        
        // Initialize edit data
        if (isOwn) {
          setEditData({
            idUser: res.data.idUser,
            firstName: res.data.firstName || '',
            lastName: res.data.lastName || '',
            phoneNumber: res.data.phoneNumber || '',
            dateOfBirth: formatDateForAPI(res.data.dateOfBirth || ''),
            gender: res.data.gender,
          });
        }
      } catch (error) {
        console.error("Lỗi khi tải thông tin user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateForAPI = (dateString: string): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      // Ensure we get YYYY-MM-DD format
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenderChange = (gender: boolean) => {
    setEditData(prev => ({
      ...prev,
      gender,
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setMessage({ type: '', text: '' });
    // Reset edit data
    if (user) {
      setEditData({
        idUser: user.idUser,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: formatDateForAPI(user.dateOfBirth || ''),
        gender: user.gender,
      });
    }
  };

  // Avatar handlers
  const triggerAvatarSelect = () => {
    if (!isOwnProfile) return;
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFieldErrors({});
    // Validation
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: 'error', text: 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận PNG, JPG, GIF, WEBP.' });
      return;
    }
    const maxSizeMB = 2;
    if (file.size > maxSizeMB * 1024 * 1024) {
      setMessage({ type: 'error', text: `Kích thước ảnh quá lớn (> ${maxSizeMB}MB).` });
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      setIsChangingAvatar(true);
      setMessage({ type: '', text: '' });
    };
    reader.readAsDataURL(file);
  };

  const handleCancelAvatar = () => {
    setIsChangingAvatar(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleUploadAvatar = async () => {
    if (!avatarFile || !user) return;
    try {
      setAvatarUploading(true);
      setMessage({ type: '', text: '' });
      // avatarPreview is already a data URL
      const dataUrl = avatarPreview!;
      const res = await changeAvatar(user.idUser, dataUrl);
      if (res.success) {
        setUser(prev => prev ? { ...prev, avatar: res.avatar || dataUrl } : prev);
        pushToast('success','Cập nhật avatar thành công!');
        handleCancelAvatar();
      } else {
        pushToast('error', res.message || 'Đổi avatar thất bại');
        if (res.message.includes('401') || res.message.includes('Unauthorized')) {
          setTimeout(() => {
            if (window.confirm('Phiên đăng nhập đã hết hạn. Bạn có muốn đăng nhập lại không?')) {
              window.location.href = '/login';
            }
          }, 300);
        }
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Đổi avatar thất bại' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    setUpdateLoading(true);
    setMessage({ type: '', text: '' });
    setFieldErrors({});

    try {
      // Basic validations
      const errors: Record<string,string> = {};
      if (!editData.firstName.trim()) errors.firstName = 'Họ không được để trống';
      if (!editData.lastName.trim()) errors.lastName = 'Tên không được để trống';
      const phonePattern = /^(0|\+84)[3-9][0-9]{8}$/;
      if (editData.phoneNumber && !phonePattern.test(editData.phoneNumber)) errors.phoneNumber = 'Số điện thoại không hợp lệ';
      const dob = formatDateForAPI(editData.dateOfBirth);
      if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) errors.dateOfBirth = 'Ngày sinh không hợp lệ';
      if (Object.keys(errors).length) {
        setFieldErrors(errors);
        throw new Error('Vui lòng sửa các lỗi được đánh dấu');
      }

      const payload: UpdateProfilePayload = {
        idUser: editData.idUser,
        firstName: editData.firstName.trim(),
        lastName: editData.lastName.trim(),
        phoneNumber: editData.phoneNumber.trim(),
        dateOfBirth: dob,
        gender: editData.gender
      };

      console.log('Sending data to API (PUT):', payload);
      const result = await updateUserProfile(payload);
      if (!result.success) throw new Error(result.message);

      pushToast('success','Cập nhật thông tin thành công!');
      setIsEditing(false);
      setUser(prev => prev ? { ...prev, ...payload } : null);
    } catch (error: any) {
      console.error('Update profile error:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || error.response?.data?.message || 'Cập nhật thông tin thất bại' 
      });
      if (!fieldErrors || Object.keys(fieldErrors).length===0) {
        // nếu lỗi tổng quát -> toast
        pushToast('error', error.message || 'Cập nhật thất bại');
      }
    } finally {
      setUpdateLoading(false);
    }
  };

  // Toast helpers
  const pushToast = (type:'success'|'error', text:string) => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev,{id,type,text}]);
    setTimeout(()=>dismissToast(id), 3800);
  };
  const dismissToast = (id:number) => {
    setToasts(prev => prev.filter(t=>t.id!==id));
  };

  const fullName = useMemo(() => {
    if (!user) return "";
    const merged = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return merged || user.username;
  }, [user]);

  const aboutItems = useMemo(
    () =>
      user
        ? [
            { icon: UserIcon, label: "Họ và tên", value: fullName || "Chưa cập nhật" },
            { icon: Hash, label: "Tên người dùng", value: user.username ? `@${user.username}` : "Chưa cập nhật" },
            { icon: Mail, label: "Email", value: user.email || "Chưa cập nhật" },
            { icon: Phone, label: "Điện thoại", value: user.phoneNumber || "Chưa cập nhật" },
            { icon: UserIcon, label: "Giới tính", value: user.gender ? "Nam" : "Nữ" },
            { icon: Calendar, label: "Ngày sinh", value: user.dateOfBirth || "Chưa cập nhật" },
            { icon: ShieldCheck, label: "Tài khoản", value: user.status ? "Đã xác thực" : "Chưa xác thực" },
            { icon: Clock, label: "Ngày tạo", value: formatDate(user.createdAt) },
            { icon: Clock, label: "Cập nhật cuối", value: formatDate(user.updatedAt) },
          ]
        : [],
    [user, fullName]
  );

  const friendCount = useMemo(() => Math.max(0, Math.round(Math.random() * 200 + 150)), []);
  const mutualFriends = useMemo(() => Math.max(4, Math.round(Math.random() * 20)), []);

  const samplePosts = useMemo(
    () => [
      {
        id: 1,
        audience: "Công khai",
        time: "2 giờ trước",
        content: "Một buổi chiều tuyệt đẹp cùng team chạy bộ ở công viên! Ai muốn tham gia cùng tụi mình không? 🏃‍♂️",
        image: "https://images.unsplash.com/photo-1520962917967-32fa1234121d?auto=format&fit=crop&w=1200&q=80",
        reactions: 134,
        comments: 42,
        shares: 9,
      },
      {
        id: 2,
        audience: "Bạn bè",
        time: "Hôm qua",
        content: "Đang tập dự án cá nhân với React và Spring Boot, tiến độ khá ổn! Ai có tips tối ưu performance không nè?",
        image: "",
        reactions: 88,
        comments: 27,
        shares: 4,
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <p className="loading-text">⏳ Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="error-container">
        <div className="error-message">
          <p>❌ Không tìm thấy người dùng</p>
          <a href="/" className="back-link">← Quay lại trang chủ</a>
        </div>
      </div>
    );
  }

  return (
    <div className="fb-profile">
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} role="alert">
            <div className="toast__text">{t.text}</div>
            <button
              type="button"
              className="toast__close"
              onClick={() => dismissToast(t.id)}
              aria-label="Đóng thông báo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <div className="fb-profile__cover">
        <div className="fb-profile__cover-image" />
        {isOwnProfile && (
          <button type="button" className="fb-btn fb-btn--cover">
            <ImageIcon size={16} />
            <span>Chỉnh sửa ảnh bìa</span>
          </button>
        )}
      </div>

      <div className="fb-profile__top">
        <div className="fb-profile__avatar-col">
          <div className="avatar-container">
            <img
              src={
                avatarPreview
                  ? avatarPreview
                  : user.avatar && user.avatar.trim() !== ""
                  ? user.avatar
                  : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEjGbsTwEJ2n8tZOeJWLkCivjuYDJBxQbIg&s"
              }
              alt="Ảnh đại diện"
              className={"avatar" + (isOwnProfile ? " avatar-hover" : "")}
              onClick={triggerAvatarSelect}
              title={isOwnProfile ? "Nhấp để đổi avatar" : ""}
            />
            {isOwnProfile && (
              <div className={`avatar-overlay ${avatarUploading ? "avatar-uploading" : ""}`}>
                {avatarUploading ? <div className="avatar-progress" /> : <span>{isChangingAvatar ? "Lưu hoặc huỷ" : "Đổi ảnh"}</span>}
              </div>
            )}
            {isOwnProfile && !isChangingAvatar && (
              <button type="button" className="avatar-change-btn" onClick={triggerAvatarSelect}>
                Đổi
              </button>
            )}
            {isChangingAvatar && (
              <div className="avatar-actions">
                <button type="button" disabled={avatarUploading} onClick={handleUploadAvatar} className="save-avatar-btn">
                  {avatarUploading ? "Đang lưu..." : "Lưu"}
                </button>
                <button type="button" disabled={avatarUploading} onClick={handleCancelAvatar} className="cancel-avatar-btn">
                  Hủy
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="visually-hidden"
              aria-labelledby="avatar-upload"
              title="Chọn ảnh đại diện"
              placeholder="Chọn ảnh đại diện"
              onChange={handleAvatarFileChange}
            />
            <div className={`status-indicator ${user.status ? "status-online" : "status-offline"}`} />
          </div>
        </div>
        <div className="fb-profile__info-col">
          <h1 className="fb-profile__name">{fullName}</h1>
          <div className="fb-profile__meta">
            {/* <span className="fb-profile__username">{user.username}</span> */}
            <span className="fb-profile__friends">
              <Users size={16} />
              <span>{friendCount.toLocaleString("vi-VN")} bạn bè</span>
              <span className="dot">•</span>
              <span>{mutualFriends} bạn chung</span>
            </span>
          </div>
          <div className="fb-profile__badges">
            <span className={`fb-badge ${user.enabled ? "fb-badge--success" : "fb-badge--danger"}`}>
              {user.enabled ? "Hoạt động" : "Khóa"}
            </span>
            <span className="fb-badge fb-badge--muted">{user.gender ? "Nam" : "Nữ"}</span>
          </div>
        </div>
        <div className="fb-profile__actions">
          {isOwnProfile ? (
            <div className="fb-profile__action-group">
              {!isEditing ? (
                <button type="button" className="fb-btn fb-btn--primary" onClick={handleEdit}>
                  <Edit size={16} />
                  <span>Chỉnh sửa trang cá nhân</span>
                </button>
              ) : (
                <div className="fb-profile__action-edit">
                  <button type="button" className="fb-btn fb-btn--primary" onClick={handleSave} disabled={updateLoading}>
                    <Save size={16} />
                    <span>{updateLoading ? "Đang lưu..." : "Lưu thay đổi"}</span>
                  </button>
                  <button type="button" className="fb-btn fb-btn--light" onClick={handleCancel}>
                    <X size={16} />
                    <span>Hủy</span>
                  </button>
                </div>
              )}
              <button type="button" className="fb-btn fb-btn--light">
                <Plus size={16} />
                <span>Thêm vào tin</span>
              </button>
            </div>
          ) : (
            <div className="fb-profile__action-group">
              <button type="button" className="fb-btn fb-btn--primary">
                <UserPlus size={16} />
                <span>Thêm bạn bè</span>
              </button>
              <button type="button" className="fb-btn fb-btn--secondary">
                <MessageCircle size={16} />
                <span>Nhắn tin</span>
              </button>
              <button type="button" className="fb-btn fb-btn--icon" aria-label="Tùy chọn khác">
                <MoreHorizontal size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="fb-profile__tabs" role="tablist">
        <button type="button" className="fb-profile__tab fb-profile__tab--active" role="tab" aria-selected="true">
          Bài viết
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Chi tiết về Dương Thuận Tri
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Bạn bè
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Ảnh
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Video
        </button>
        <button type="button" className="fb-profile__tab" role="tab">
          Xem thêm
        </button>
      </div>

      <div className="fb-profile__layout">
        <aside className="fb-profile__sidebar">
          {isEditing ? (
            <div className="fb-card fb-profile__edit-card">
              <div className="fb-card__header">
                <h2>Chỉnh sửa thông tin</h2>
              </div>
              <div className="fb-profile__edit-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-first-name">Họ</label>
                    <input
                      id="profile-first-name"
                      type="text"
                      name="firstName"
                      value={editData.firstName}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.firstName ? " error" : ""}`}
                      placeholder="Nhập họ của bạn"
                      title="Họ"
                    />
                    {fieldErrors.firstName && <div className="field-error">{fieldErrors.firstName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-last-name">Tên</label>
                    <input
                      id="profile-last-name"
                      type="text"
                      name="lastName"
                      value={editData.lastName}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.lastName ? " error" : ""}`}
                      placeholder="Nhập tên của bạn"
                      title="Tên"
                    />
                    {fieldErrors.lastName && <div className="field-error">{fieldErrors.lastName}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-phone-number">Số điện thoại</label>
                    <input
                      id="profile-phone-number"
                      type="tel"
                      name="phoneNumber"
                      value={editData.phoneNumber}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.phoneNumber ? " error" : ""}`}
                      placeholder="0909123456"
                      title="Số điện thoại"
                    />
                    {fieldErrors.phoneNumber && <div className="field-error">{fieldErrors.phoneNumber}</div>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="profile-dob">Ngày sinh</label>
                    <input
                      id="profile-dob"
                      type="date"
                      name="dateOfBirth"
                      value={formatDateForInput(editData.dateOfBirth)}
                      onChange={handleInputChange}
                      className={`form-input${fieldErrors.dateOfBirth ? " error" : ""}`}
                    />
                    {fieldErrors.dateOfBirth && <div className="field-error">{fieldErrors.dateOfBirth}</div>}
                  </div>
                  <div className="form-group">
                    <span className="form-label">Giới tính</span>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gender"
                          checked={editData.gender === true}
                          onChange={() => handleGenderChange(true)}
                        />
                        <span>Nam</span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="gender"
                          checked={editData.gender === false}
                          onChange={() => handleGenderChange(false)}
                        />
                        <span>Nữ</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="fb-profile__edit-actions">
                  <button type="button" className="fb-btn fb-btn--primary" onClick={handleSave} disabled={updateLoading}>
                    {updateLoading ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button type="button" className="fb-btn fb-btn--light" onClick={handleCancel} disabled={updateLoading}>
                    Hủy
                  </button>
                </div>
                {message.text && <div className={`profile-message ${message.type}`}>{message.text}</div>}
              </div>
            </div>
          ) : (
            <div className="fb-card fb-profile__about-card">
              <div className="fb-card__header">
                <h2>Giới thiệu</h2>
                {isOwnProfile && (
                  <button type="button" className="fb-link-button" onClick={handleEdit}>
                    Chỉnh sửa
                  </button>
                )}
              </div>
              <ul className="fb-profile__about-list">
                {aboutItems.map(item => (
                  <li key={item.label}>
                    <item.icon size={18} />
                    <div>
                      <span className="label">{item.label}</span>
                      <span className="value">{item.value || "Chưa cập nhật"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          

          {/* <section className="fb-card fb-profile__photos">
            <div className="fb-card__header">
              <h2>Ảnh</h2>
              <button type="button" className="fb-link-button">Xem tất cả</button>
            </div>
            <div className="fb-photos-grid">
              {samplePhotos.map((photo, index) => (
                <img key={index} src={photo} alt={`Ảnh ${index + 1}`} />
              ))}
            </div>
          </section>

          <section className="fb-card fb-profile__friends">
            <div className="fb-card__header">
              <h2>Bạn bè</h2>
              <span>{friendCount.toLocaleString("vi-VN")} người bạn</span>
            </div>
            <div className="fb-friends-grid">
              {sampleFriends.map(friend => (
                <div key={friend.id} className="fb-friend">
                  <img src={friend.avatar} alt={friend.name} />
                  <span>{friend.name}</span>
                </div>
              ))}
            </div>
          </section> */}
        </aside>

        <section className="fb-profile__main">
          {isOwnProfile && (
            <div className="fb-card fb-profile__composer">
              <div className="fb-profile__composer-top">
                <img
                  src={
                    avatarPreview
                      ? avatarPreview
                      : user.avatar && user.avatar.trim() !== ""
                      ? user.avatar
                      : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEjGbsTwEJ2n8tZOeJWLkCivjuYDJBxQbIg&s"
                  }
                  alt="Ảnh đại diện của bạn"
                />
                <button type="button">Bạn đang nghĩ gì thế?</button>
              </div>
              <div className="fb-profile__composer-actions">
                <button type="button">🎥 Video trực tiếp</button>
                <button type="button">📷 Ảnh/video</button>
                <button type="button">😊 Cảm xúc/hoạt động</button>
              </div>
            </div>
          )}

          

          <div className="fb-profile__posts">
            {samplePosts.map(post => (
              <article key={post.id} className="fb-card fb-post-card">
                <header className="fb-post-card__header">
                  <img
                    src={user.avatar && user.avatar.trim() !== "" ? user.avatar : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEjGbsTwEJ2n8tZOeJWLkCivjuYDJBxQbIg&s"}
                    alt={fullName}
                  />
                  <div>
                    <strong>{fullName}</strong>
                    <div className="fb-post-card__meta">
                      <span>{post.time}</span>
                      <span>·</span>
                      <span>{post.audience}</span>
                    </div>
                  </div>
                  <button type="button" className="fb-post-card__more" aria-label="Tùy chọn khác">
                    ···
                  </button>
                </header>
                <p className="fb-post-card__content">{post.content}</p>
                {post.image && (
                  <figure className="fb-post-card__image">
                    <img src={post.image} alt="Bài viết" />
                  </figure>
                )}
                <footer className="fb-post-card__footer">
                  <div className="fb-post-card__stats">
                    <span>👍 {post.reactions.toLocaleString("vi-VN")}</span>
                    <span>{post.comments} bình luận</span>
                    <span>{post.shares} lượt chia sẻ</span>
                  </div>
                  <div className="fb-post-card__actions">
                    <button type="button">👍 Thích</button>
                    <button type="button">💬 Bình luận</button>
                    <button type="button">↗️ Chia sẻ</button>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProfileDetail;
