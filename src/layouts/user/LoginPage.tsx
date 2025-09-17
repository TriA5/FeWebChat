import React, { useState } from 'react';
import { authenticate, validateLoginForm, isLoggedIn, logout } from '../../api/user/loginApi';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [form, setForm] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    setMessage('Đang đăng nhập...');
    setErrors([]);
    setIsSuccess(false);

    // Validate form
    const validationErrors = validateLoginForm(form.username, form.password);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setMessage('Vui lòng kiểm tra lại thông tin!');
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔑 Attempting login:', { username: form.username });
      const result = await authenticate(form.username, form.password);
      
      console.log('✅ Login successful:', result);
      
      setIsSuccess(true);
      setMessage(result.message || 'Đăng nhập thành công! Token đã được lưu.');
      
      // Redirect sau 2 giây
      setTimeout(() => {
        window.location.href = '/'; // hoặc sử dụng React Router
      }, 200);
      
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setIsSuccess(false);
      setMessage('Đăng nhập thất bại!');
      setErrors([error.message || 'Có lỗi xảy ra trong quá trình đăng nhập']);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>Đăng Nhập</h2>
          <p>Chào mừng trở lại ChatWeb!</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              name="username"
              value={form.username}
              onChange={handleInputChange}
              placeholder="Nhập username..."
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleInputChange}
              placeholder="Nhập password..."
              disabled={isLoading}
              className="form-input"
            />
          </div>

          <button 
            type="submit" 
            disabled={isLoading}
            className="login-button"
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
          </button>
        </form>

        {/* Message Display */}
        {message && (
          <div className={`message ${isSuccess ? 'success' : 'info'}`}>
            {message}
          </div>
        )}

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="error-container">
            {errors.map((error, index) => (
              <div key={index} className="error-message">
                {error}
              </div>
            ))}
          </div>
        )}

        {/* Links */}
        <div className="login-links">
          <a href="/register">Chưa có tài khoản? Đăng ký ngay</a>
          <a href="/forgot-password">Quên mật khẩu?</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;