import React, { useState, useEffect, useRef, useCallback } from 'react';
import { activeAccount, validateActivationParams, decodeEmailCompletely } from '../../api/user/ActiveAccount';
import './ActiveAccountPage.css';

const ActiveAccountPage: React.FC = () => {
  const [form, setForm] = useState({ email: '', activationCode: '' });
  const [message, setMessage] = useState<string>('Nhập thông tin kích hoạt tài khoản');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const isActivatingRef = useRef(false); // chặn concurrent calls
  const didAutoActivate = useRef(false); // chặn gọi 2 lần khi StrictMode remount
  const activationCountRef = useRef(0);

  // Xử lý thay đổi input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Hàm gọi API active
  const handleActivation = useCallback(async (email?: string, code?: string) => {
    if (isLoading || isActivatingRef.current) {
      console.log('⏹️ SKIP ACTIVATION - Already loading/activating');
      return;
    }

    isActivatingRef.current = true;
    activationCountRef.current += 1;

    let emailToUse = email || form.email;
    const codeToUse = code || form.activationCode;

    emailToUse = decodeEmailCompletely(emailToUse);

    console.log(`🔥 CALL API #${activationCountRef.current}`, { email: emailToUse, code: codeToUse });

    setIsLoading(true);
    setMessage('Đang kích hoạt tài khoản...');
    setErrors([]);
    setIsSuccess(false);

    // validate
    const validationErrors = validateActivationParams(emailToUse, codeToUse);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      setMessage('Vui lòng kiểm tra lại thông tin!');
      setIsLoading(false);
      isActivatingRef.current = false;
      return;
    }

    try {
      const result = await activeAccount(emailToUse, codeToUse);

      if (result.success) {
        setMessage('🎉 Kích hoạt tài khoản thành công! Bạn có thể đăng nhập ngay bây giờ.');
        setIsSuccess(true);
      } else if (result.message?.includes('đã được kích hoạt')) {
        setMessage('✅ Tài khoản đã được kích hoạt trước đó! Bạn có thể đăng nhập ngay.');
        setIsSuccess(true);
      } else {
        setMessage(`❌ ${result.message}`);
        setErrors([result.message]);
      }
    } catch (err) {
      console.error('Activation error:', err);
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại!';
      setMessage(`❌ ${msg}`);
      setErrors([msg]);
    }

    setIsLoading(false);
    isActivatingRef.current = false;
  }, [form.email, form.activationCode, isLoading]);

  // Auto-fill và auto-activate từ URL
  useEffect(() => {
    if (didAutoActivate.current) {
      console.log('⏹️ SKIP USE_EFFECT - Already auto-activated');
      return;
    }

    let emailParam = '';
    let codeParam = '';

    // /active/email/code
    const pathSegments = window.location.pathname.split('/');
    if (pathSegments.length >= 4 && pathSegments[1] === 'active') {
      emailParam = decodeEmailCompletely(pathSegments[2]);
      codeParam = pathSegments[3];
    } else {
      // query params
      const urlParams = new URLSearchParams(window.location.search);
      emailParam = urlParams.get('email') || '';
      codeParam = urlParams.get('activationCode') || '';
    }

    if (emailParam && codeParam) {
      didAutoActivate.current = true; // ✅ khóa gọi lần 2 (StrictMode)
      setForm({ email: emailParam, activationCode: codeParam });
      setMessage('Thông tin kích hoạt đã được tự động điền từ link email');

      // auto activate
      handleActivation(emailParam, codeParam);
    }
  }, [handleActivation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleActivation();
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

        {errors.length > 0 && !isSuccess && (
          <div className="error-messages">
            {errors.map((err, i) => (
              <div key={i} className="error-message">❌ {err}</div>
            ))}
          </div>
        )}

        {form.email && form.activationCode && (
          <div className="activation-info">
            <p><strong>Email:</strong> {form.email}</p>
            <p><strong>Mã kích hoạt:</strong> {form.activationCode.substring(0, 8)}...</p>
          </div>
        )}

        {!isSuccess && (
          <form className="activation-form" onSubmit={handleSubmit}>
            <input
              type="email"
              name="email"
              placeholder="Email của bạn"
              value={form.email}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="activationCode"
              placeholder="Mã kích hoạt"
              value={form.activationCode}
              onChange={handleChange}
              required
            />
            <button type="submit" className="activate-btn" disabled={isLoading}>
              {isLoading ? '⏳ Đang kích hoạt...' : '🔓 Kích hoạt tài khoản'}
            </button>
          </form>
        )}

        {isLoading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Đang xử lý...</p>
          </div>
        )}

        {isSuccess && (
          <div className="success-actions">
            <div className="success-info">
              <p>🎯 Tài khoản của bạn đã sẵn sàng sử dụng!</p>
            </div>
            <button className="login-btn" onClick={() => (window.location.href = '/login')}>
              🚀 Đăng nhập ngay
            </button>
          </div>
        )}

        <div className="activation-help">
          <p>💡 Không nhận được email kích hoạt?</p>
          <button className="resend-btn" disabled={isLoading}>
            📧 Gửi lại email kích hoạt
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveAccountPage;
