import React, { useState, useEffect } from 'react';
import { activeAccount, validateActivationParams } from '../../api/user/ActiveAccount';
import './ActiveAccountPage.css';

interface PathActivationProps {
  email?: string;
  activationCode?: string;
}

const PathActivationPage: React.FC<PathActivationProps> = () => {
  const [form, setForm] = useState({
    email: '',
    activationCode: ''
  });
  const [message, setMessage] = useState<string>('Đang xử lý kích hoạt tài khoản...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const handleActivation = async (email: string, code: string) => {
    setIsLoading(true);
    setMessage('Đang kích hoạt tài khoản...');
    setErrors([]);
    setIsSuccess(false);

    console.log('Attempting activation with:', { email, code });

    // Validate
    const validationErrors = validateActivationParams(email, code);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setMessage('Thông tin kích hoạt không hợp lệ!');
      setIsLoading(false);
      return;
    }

    try {
      const result = await activeAccount(email, code);
      
      if (result.success) {
        setMessage('🎉 Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.');
        setIsSuccess(true);
        setErrors([]);
      } else {
        setMessage(`❌ ${result.message}`);
        setErrors([result.message]);
      }
    } catch (error) {
      console.error('Activation error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Có lỗi xảy ra, vui lòng thử lại!';
      setMessage(`❌ ${errorMsg}`);
      setErrors([errorMsg]);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    // Parse URL path để lấy email và activation code
    const pathSegments = window.location.pathname.split('/');
    console.log('Full URL:', window.location.href);
    console.log('Path segments:', pathSegments);
    
    if (pathSegments.length >= 4 && pathSegments[1] === 'active') {
      // Decode email properly để đảm bảo @ không bị encode
      const rawEmail = pathSegments[2];
      const email = decodeURIComponent(rawEmail).replace('%40', '@');
      const code = pathSegments[3];
      
      console.log('Raw email from path:', rawEmail);
      console.log('Decoded email:', email);
      console.log('Activation code:', code);
      
      setForm({ email, activationCode: code });
      setMessage('Đã nhận thông tin kích hoạt từ link email');
      
      // Tự động kích hoạt
      handleActivation(email, code);
    } else {
      setMessage('❌ Link kích hoạt không hợp lệ');
      setIsLoading(false);
    }
  }, []);

  const handleRetryActivation = () => {
    if (form.email && form.activationCode) {
      handleActivation(form.email, form.activationCode);
    }
  };

  return (
    <div className="activation-container">
      <div className="activation-box">
        <div className="activation-header">
          <h2>🔐 Kích hoạt tài khoản</h2>
        </div>
        
        <div className={`chat-message ${isSuccess ? 'success' : errors.length > 0 ? 'error' : ''}`}>
          {message}
        </div>
        
        {errors.length > 0 && (
          <div className="error-messages">
            {errors.map((error, index) => (
              <div key={index} className="error-message">❌ {error}</div>
            ))}
          </div>
        )}

        {/* Hiển thị thông tin đang xử lý */}
        {form.email && form.activationCode && (
          <div className="activation-info">
            <p><strong>Email:</strong> {form.email}</p>
            <p><strong>Mã kích hoạt:</strong> {form.activationCode.substring(0, 8)}...</p>
          </div>
        )}

        {/* Nút thử lại nếu lỗi */}
        {!isLoading && !isSuccess && errors.length > 0 && (
          <button 
            className="activate-btn"
            onClick={handleRetryActivation}
            disabled={isLoading}
          >
            🔄 Thử lại
          </button>
        )}

        {/* Nút đăng nhập nếu thành công */}
        {isSuccess && (
          <div className="success-actions">
            <button 
              className="login-btn"
              onClick={() => window.location.href = '/login'}
            >
              🚀 Đăng nhập ngay
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Đang xử lý...</p>
          </div>
        )}
        
        <div className="activation-help">
          <p>💡 Gặp vấn đề?</p>
          <button 
            className="resend-btn" 
            onClick={() => window.location.href = '/contact'}
          >
            📞 Liên hệ hỗ trợ
          </button>
        </div>
      </div>
    </div>
  );
};

export default PathActivationPage;