import React, { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import { getUserInfo } from '../../api/user/loginApi';
import { changeAvatar } from '../../api/user/avatarApi';
import { updateUserProfile, UpdateProfileRequest as UpdateProfilePayload } from '../../api/user/profileApi';
import "./ProfileDetail.css";

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
    <div className="profile-container">
      <div className="profile-card">
        {/* Toasts */}
        <div className="toast-container" aria-live="polite" aria-atomic="true">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`} role="alert">
              <div style={{flex:1}}>{t.text}</div>
              <button onClick={()=>dismissToast(t.id)} style={{background:'transparent',border:'none',color:'#64748b',cursor:'pointer',fontSize:'14px'}}>✕</button>
            </div>
          ))}
        </div>
        {/* Header with Avatar and Basic Info */}
        <div className="profile-header">
          <div className="avatar-container">
            <img
              src={
                avatarPreview ? avatarPreview : (user.avatar && user.avatar.trim() !== ""
                  ? user.avatar
                  : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQEjGbsTwEJ2n8tZOeJWLkCivjuYDJBxQbIg&s")
              }
              alt="Avatar"
              className={"avatar" + (isOwnProfile ? ' avatar-hover' : '')}
              onClick={triggerAvatarSelect}
              title={isOwnProfile ? 'Nhấp để đổi avatar' : ''}
            />
            {isOwnProfile && (
              <div className={`avatar-overlay ${avatarUploading ? 'avatar-uploading' : ''}`}> 
                {avatarUploading ? <div className="avatar-progress"/> : <span>{isChangingAvatar ? 'Lưu hoặc huỷ' : 'Đổi ảnh'}</span>} 
              </div>
            )}
            {isOwnProfile && !isChangingAvatar && (
              <button type="button" className="avatar-change-btn" onClick={triggerAvatarSelect}>Đổi</button>
            )}
            {isChangingAvatar && (
              <div className="avatar-actions">
                <button type="button" disabled={avatarUploading} onClick={handleUploadAvatar} className="save-avatar-btn">
                  {avatarUploading ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button type="button" disabled={avatarUploading} onClick={handleCancelAvatar} className="cancel-avatar-btn">Hủy</button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="visually-hidden"
              aria-label="Chọn ảnh đại diện"
              onChange={handleAvatarFileChange}
            />
            <div className={`status-indicator ${user.status ? 'status-online' : 'status-offline'}`}></div>
          </div>
          
          <h1 className="profile-name">
            {user.firstName} {user.lastName}
          </h1>
          <p className="profile-username">{user.username}</p>
          
          <div className="status-badges">
            <span className={`badge ${user.enabled ? 'badge-enabled' : 'badge-disabled'}`}>
              {user.enabled ? "Hoạt động" : "Khóa"}
            </span>
            <span className="badge badge-gender">
              {user.gender ? "Nam" : "Nữ"}
            </span>
          </div>
          
          {/* Edit button for own profile */}
          {isOwnProfile && (
            <div className="profile-actions">
              {!isEditing ? (
                <button onClick={handleEdit} className="edit-btn">
                  <Edit size={16} />
                  Chỉnh sửa thông tin
                </button>
              ) : (
                <div className="edit-actions">
                  <button onClick={handleSave} disabled={updateLoading} className="save-btn">
                    <Save size={16} />
                    {updateLoading ? 'Lưu...' : 'Lưu'}
                  </button>
                  <button onClick={handleCancel} className="cancel-btn">
                    <X size={16} />
                    Hủy
                  </button>
                </div>
              )}
            </div>
          )}
          
          {/* Message display */}
          {message.text && (
            <div className={`profile-message ${message.type}`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="profile-content">
          {/* Personal Information */}
          <div className="info-section">
            <h2 className="section-title">
              <div className="section-icon">
                <UserIcon size={20} />
              </div>
              Thông tin cá nhân
            </h2>
            
            {!isEditing ? (
              <>
                <div className="info-item">
                  <Mail className="info-icon" />
                  <span className="info-label">Email:</span>
                  <span className="info-value">{user.email || "Chưa cập nhật"}</span>
                </div>
                
                <div className="info-item">
                  <Phone className="info-icon" />
                  <span className="info-label">Số điện thoại:</span>
                  <span className="info-value">{user.phoneNumber || "Chưa cập nhật"}</span>
                </div>
                
                <div className="info-item">
                  <Calendar className="info-icon" />
                  <span className="info-label">Sinh nhật:</span>
                  <span className="info-value">{user.dateOfBirth || "Chưa cập nhật"}</span>
                </div>
              </>
            ) : (
              <div className="edit-form">
                <div className="form-group">
                  <label className="form-label">Họ:</label>
                  <input
                    type="text"
                    name="firstName"
                    value={editData.firstName}
                    onChange={handleInputChange}
                    className={`form-input${fieldErrors.firstName ? ' error' : ''}`}
                    placeholder="Nhập họ của bạn"
                  />
                  {fieldErrors.firstName && <div className="field-error">{fieldErrors.firstName}</div>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Tên:</label>
                  <input
                    type="text"
                    name="lastName"
                    value={editData.lastName}
                    onChange={handleInputChange}
                    className={`form-input${fieldErrors.lastName ? ' error' : ''}`}
                    placeholder="Nhập tên của bạn"
                  />
                  {fieldErrors.lastName && <div className="field-error">{fieldErrors.lastName}</div>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Số điện thoại:</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={editData.phoneNumber}
                    onChange={handleInputChange}
                    className={`form-input${fieldErrors.phoneNumber ? ' error' : ''}`}
                    placeholder="0909123456"
                  />
                  {fieldErrors.phoneNumber && <div className="field-error">{fieldErrors.phoneNumber}</div>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Ngày sinh:</label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formatDateForInput(editData.dateOfBirth)}
                    onChange={handleInputChange}
                    className={`form-input${fieldErrors.dateOfBirth ? ' error' : ''}`}
                  />
                  {fieldErrors.dateOfBirth && <div className="field-error">{fieldErrors.dateOfBirth}</div>}
                </div>
                
                <div className="form-group">
                  <label className="form-label">Giới tính:</label>
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
            )}
          </div>

          {/* Account Information */}
          <div className="info-section">
            <h2 className="section-title">
              <div className="section-icon">
                <ShieldCheck size={20} />
              </div>
              Thông tin tài khoản
            </h2>
            
            <div className="info-item">
              <Hash className="info-icon" />
              <span className="info-label">ID người dùng:</span>
              <span className="info-value">{user.idUser.substring(0, 8)}...</span>
            </div>
            
            <div className="info-item">
              <ShieldCheck className="info-icon" />
              <span className="info-label">Trạng thái:</span>
              <span className="info-value">
                {user.status ? "Đã xác thực" : "Chưa xác thực"}
              </span>
            </div>
            
            <div className="info-item">
              <Clock className="info-icon" />
              <span className="info-label">Ngày tạo:</span>
              <span className="info-value">{formatDate(user.createdAt)}</span>
            </div>
            
            <div className="info-item">
              <Clock className="info-icon" />
              <span className="info-label">Cập nhật cuối:</span>
              <span className="info-value">{formatDate(user.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDetail;
