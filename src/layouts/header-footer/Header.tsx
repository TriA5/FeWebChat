import React from 'react';
import './Header.css';
import NotificationBell from '../util/NotificationBell';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
	// const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
	// const [userInfo, setUserInfo] = useState<any>(null);

	// useEffect(() => {
	// 	const loggedIn = isLoggedIn();
	// 	setIsUserLoggedIn(loggedIn);
		
	// 	if (loggedIn) {
	// 		const user = getUserInfo();
	// 		setUserInfo(user);
	// 	}
	// }, []);

	// const handleLogout = () => {
	// 	logout();
	// 	setIsUserLoggedIn(false);
	// 	setUserInfo(null);
	// 	window.location.href = '/';
	// };
	// {isUserLoggedIn ? (
	// 				<>
	// 					<NavLink to={`/user/${userInfo?.id}`} className="header-link">Xin chào, {userInfo?.username || 'User'}!</NavLink>
	// 					<NavLink to="/chat" className="header-link">Chat</NavLink>
    //                     <NavLink to="/friends" className="header-link">Bạn bè</NavLink>
	// 					<button onClick={handleLogout} className="header-link logout-btn">Đăng xuất</button>
	// 				</>
	// 			)

	return (
		<header className="chat-header">
			<div className="header-left">
				<img src="http://res.cloudinary.com/dytdhvf3s/image/upload/v1760508458/User_5e3ca275-4ec3-45c3-8f53-f173871d002e.jpg" alt="Logo" className="header-logo" />
				<span className="header-title">ChatBook</span>
			</div>
			<nav className="header-nav">
				<Link to="/" className="header-link">Trang chủ</Link>
				 
				<>
					<Link to="login" className="header-link">Đăng nhập</Link>
					<Link to="register" className="header-link">Đăng ký</Link>
				</>
				
			</nav>
		</header>
	);
};

export default Header;
