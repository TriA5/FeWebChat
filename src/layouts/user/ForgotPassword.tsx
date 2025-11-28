import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ForgotPassword.css';
import { forgotPassword } from '../../api/user/userApi';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateEmail = (e: string) => {
    if (!e || e.trim() === '') return 'Vui lòng nhập email';
    // simple email regex
    const re = /^\S+@\S+\.\S+$/;
    if (!re.test(e)) return 'Email không hợp lệ';
    return null;
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    setSuccess(null);
    const v = validateEmail(email);
    if (v) {
      setError(v);
      return;
    }
    try {
      setLoading(true);
      const resp = await forgotPassword(email.trim());
      console.log('forgotPassword response', resp);
      setSuccess('Nếu email tồn tại, một hướng dẫn khôi phục mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư.');
    } catch (err: any) {
      console.error('forgotPassword error', err);
      setError(err.message || 'Lỗi khi yêu cầu khôi phục mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-card">
        <h2>Quên mật khẩu</h2>
        <p>Nhập email của bạn để nhận hướng dẫn đặt lại mật khẩu.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
          </div>

          {error && <div className="fp-error">❌ {error}</div>}
          {success && <div className="fp-success">✅ {success}</div>}

          <div className="actions">
            <button type="submit" disabled={loading}>{loading ? 'Đang gửi...' : 'Gửi yêu cầu'}</button>
            <button type="button" className="btn-link" onClick={() => navigate('/login')}>Quay về đăng nhập</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword;
