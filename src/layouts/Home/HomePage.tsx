import React from 'react';
import './HomePage.css';
import Header from '../header-footer/Header';
import Footer from '../header-footer/Footer';

const HomePage: React.FC = () => {
  return (
    <>
    {/* <Header /> */}
    <div className="homepage-container">
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Chào mừng đến với <span className="brand-name">ChatWeb</span>
          </h1>
          <p className="hero-subtitle">
            Nền tảng chat hiện đại, kết nối mọi người một cách dễ dàng và thuận tiện
          </p>
          <div className="hero-buttons">
            <button className="btn-primary">Bắt đầu ngay</button>
            <button className="btn-secondary">Tìm hiểu thêm</button>
          </div>
        </div>
        <div className="hero-image">
          <div className="chat-bubble bubble-1">
            <span>Xin chào! 👋</span>
          </div>
          <div className="chat-bubble bubble-2">
            <span>Chào bạn! Hôm nay thế nào?</span>
          </div>
          <div className="chat-bubble bubble-3">
            <span>Tuyệt vời! 😊</span>
          </div>
        </div>
      </div>
      
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">Tính năng nổi bật</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3>Chat thời gian thực</h3>
              <p>Trò chuyện ngay lập tức với bạn bè và đồng nghiệp</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Bảo mật cao</h3>
              <p>Mã hóa đầu cuối để bảo vệ thông tin cá nhân của bạn</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🌐</div>
              <h3>Đa nền tảng</h3>
              <p>Sử dụng trên mọi thiết bị, mọi lúc mọi nơi</p>
            </div>
          </div>
        </div>
      </section>
    </div>
    {/* <Footer /> */}
    </>
  );
};

export default HomePage;
