import React, { useState, useEffect } from 'react';
import { isLoggedIn, logout, getUserInfo } from '../../api/user/loginApi';
import logo from '../../logo.svg';
import './Header.css';
import { NavLink } from 'react-router-dom';

const Header: React.FC = () => {
	const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
	const [userInfo, setUserInfo] = useState<any>(null);

	useEffect(() => {
		const loggedIn = isLoggedIn();
		setIsUserLoggedIn(loggedIn);
		
		if (loggedIn) {
			const user = getUserInfo();
			setUserInfo(user);
		}
	}, []);

	const handleLogout = () => {
		logout();
		setIsUserLoggedIn(false);
		setUserInfo(null);
		window.location.href = '/';
	};

	return (
		<header className="chat-header">
			<div className="header-left">
				<img src={logo} alt="Logo" className="header-logo" />
				<span className="header-title">ChatWeb</span>
			</div>
			<nav className="header-nav">
				<a href="/" className="header-link">Trang chủ</a>
				{isUserLoggedIn ? (
					<>
						<span className="header-welcome">Xin chào, {userInfo?.username || 'User'}!</span>
						<NavLink to="/chat" className="header-link">Chat</NavLink>
                        <NavLink to="/friends" className="header-link">Bạn bè</NavLink>
						<button onClick={handleLogout} className="header-link logout-btn">Đăng xuất</button>
					</>
				) : (
					<>
						<a href="/login" className="header-link">Đăng nhập</a>
						<a href="/register" className="header-link">Đăng ký</a>
					</>
				)}
			</nav>
		</header>
	);
};

export default Header;
