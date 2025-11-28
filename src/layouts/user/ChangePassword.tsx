import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ChangePassword.css';
import { getUserInfo } from '../../api/user/loginApi';
import { changePassword } from '../../api/user/userApi';

const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const currentUser = getUserInfo();

  const validate = (): string | null => {
    if (!newPassword || !confirmPassword) return 'Vui lòng nhập mật khẩu mới và xác nhận';
    if (newPassword !== confirmPassword) return 'Mật khẩu mới và xác nhận không khớp';
    if (newPassword.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    if (!currentUser?.id) {
      setError('Bạn cần đăng nhập để đổi mật khẩu');
      return;
    }

    try {
      setLoading(true);
      // Call API
      await changePassword(currentUser.id, newPassword);
      setSuccess('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.');
      // Optionally sign out user or redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (err: any) {
      console.error('changePassword error', err);
      setError(err.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="change-password-page">
      <div className="change-password-card">
        <h2>Đổi mật khẩu</h2>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Mật khẩu hiện tại</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Nhập mật khẩu hiện tại (nếu có)" />
          </div>
          <div className="field">
            <label>Mật khẩu mới</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mật khẩu mới" />
          </div>
          <div className="field">
            <label>Xác nhận mật khẩu mới</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Nhập lại mật khẩu mới" />
          </div>

          {error && <div className="cp-error">❌ {error}</div>}
          {success && <div className="cp-success">✅ {success}</div>}

          <div className="actions">
            <button type="submit" disabled={loading}>{loading ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
            <button type="button" className="btn-cancel" onClick={() => navigate(-1)}>Hủy</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePassword;
