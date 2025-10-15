import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../../api/user/loginApi';
import useCurrentUser from '../../../hooks/useCurrentUser';

const HeaderHome: React.FC = () => {
  const navigate = useNavigate();
  const { user, refresh } = useCurrentUser();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) {
      setDropdownOpen(false);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayName = useMemo(() => {
    if (!user) return '';
    if (user.firstName || user.lastName) {
      return [user.firstName, user.lastName].filter(Boolean).join(' ');
    }
    return user.username || 'Người dùng';
  }, [user]);

  const handleLogout = async () => {
    logout();
    setDropdownOpen(false);
    await refresh();
    navigate('/');
  };

  return (
    <header className="fb-header">
      <div className="fb-header__left">
        <div className="fb-logo">
          <img 
            src="http://res.cloudinary.com/dytdhvf3s/image/upload/v1760508458/User_5e3ca275-4ec3-45c3-8f53-f173871d002e.jpg" 
            alt="ChatBook Logo" 
            className="fb-logo__image"
          />
          <span className="fb-logo__text">ChatBook</span>
        </div>
        <div className="fb-search">
          <span className="fb-search__icon">🔍</span>
          <input type="search" placeholder="Tìm kiếm trên ChatBook" aria-label="Tìm kiếm" />
        </div>
      </div>
      <nav className="fb-header__center" aria-label="Điều hướng chính">
        <NavLink to="/home"><button className="active" aria-label="Trang chủ">🏠</button></NavLink>
        <NavLink to="/watch"><button aria-label="Watch">📺</button></NavLink>
        <NavLink to="/marketplace"><button aria-label="Marketplace">🛍️</button></NavLink>
        <NavLink to="/friends"><button aria-label="Bạn bè">👥</button></NavLink>
        <NavLink to="/games"><button aria-label="Trò chơi">🎮</button></NavLink>
      </nav>
      <div className="fb-header__right">
        <button aria-label="Menu">☰</button>
        <NavLink to="/chat" aria-label="Tin nhắn">💬</NavLink>
        <button aria-label="Thông báo">🔔</button>
        {user ? (
          <div className="fb-header__user" ref={dropdownRef}>
            <button
              type="button"
              className="fb-header__avatar-btn"
              onClick={() => setDropdownOpen(prev => !prev)}
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
            >
              {user.avatar ? (
                <img src={user.avatar} alt={displayName} className="fb-header__avatar" />
              ) : (
                <span className="fb-header__avatar-fallback">{displayName.charAt(0)?.toUpperCase() || 'U'}</span>
              )}
            </button>
            {isDropdownOpen && (
              <div className="fb-header__dropdown">
                <div className="fb-header__dropdown-name">{displayName}</div>
                <button
                  type="button"
                  className="fb-header__dropdown-item"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate(`/user/${user.id}`);
                  }}
                >
                  Trang cá nhân
                </button>
                <button
                  type="button"
                  className="fb-header__dropdown-item fb-header__dropdown-item--danger"
                  onClick={handleLogout}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="fb-header__login-link">Đăng nhập</Link>
        )}
      </div>
    </header>
  );
};

export default HeaderHome;