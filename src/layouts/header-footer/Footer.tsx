import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="chat-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">ChatWeb</h3>
            <p className="footer-description">
              Nền tảng chat hiện đại, kết nối mọi người một cách dễ dàng và an toàn.
            </p>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-heading">Liên kết nhanh</h4>
            <ul className="footer-links">
              <li><a href="/">Trang chủ</a></li>
              <li><a href="/about">Giới thiệu</a></li>
              <li><a href="/contact">Liên hệ</a></li>
              <li><a href="/help">Hỗ trợ</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-heading">Tài khoản</h4>
            <ul className="footer-links">
              <li><a href="/login">Đăng nhập</a></li>
              <li><a href="/register">Đăng ký</a></li>
              <li><a href="/profile">Hồ sơ</a></li>
              <li><a href="/settings">Cài đặt</a></li>
            </ul>
          </div>
          
          <div className="footer-section">
            <h4 className="footer-heading">Kết nối với chúng tôi</h4>
            <div className="social-links">
              <button className="social-link" title="Facebook">📘</button>
              <button className="social-link" title="Twitter">🐦</button>
              <button className="social-link" title="Instagram">📷</button>
              <button className="social-link" title="LinkedIn">💼</button>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="footer-bottom-content">
            <p>&copy; 2025 ChatWeb. Tất cả quyền được bảo lưu.</p>
            <div className="footer-bottom-links">
              <a href="/privacy">Chính sách bảo mật</a>
              <a href="/terms">Điều khoản sử dụng</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
