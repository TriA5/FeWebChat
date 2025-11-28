import React from "react";
import "./App.css";
import { Outlet, Route, Routes } from "react-router-dom";
import RegisterPage from "./layouts/user/RegisterPage";
import LoginPage from "./layouts/user/LoginPage";
import Friendship from "./layouts/user/Friendship";
import Chat from "./layouts/user/Chat";
import HomePage from "./layouts/Home/HomePage";
import Header from "./layouts/header-footer/Header";
import Footer from "./layouts/header-footer/Footer";
import PathActivationPage from "./layouts/user/PathActivationPage";
import ProfileDetail from "./layouts/user/ProfileDetail";
import GroupMembersPage from "./layouts/user/GroupMembersPage";
import Home from "./layouts/TrangChu/Home";
import CreatePoster from "./layouts/TrangChu/CreatePoster";
import PosterDetail from "./layouts/TrangChu/PosterDetail";
import EditPoster from "./layouts/TrangChu/EditPoster";
import RequireAuth from "./components/RequireAuth";
import HeaderHome from "./layouts/page/layout/HeaderHome";
import GeminiChat from "./layouts/gemini/GeminiChat";
import NotificationPage from "./layouts/util/NotificationPage";

// Lazy loaded pages (keep import declarations at the top)
const LazyForgotPassword = React.lazy(() => import('./layouts/user/ForgotPassword'));
const LazyChangePassword = React.lazy(() => import('./layouts/user/ChangePassword'));

const PublicLayout: React.FC = () => {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
};

const HeaderHomeLayout: React.FC = () => {
  return (
    <>
      <HeaderHome />
      <Outlet />
    </>
  );
};

function App() {
  return (
    <div className="App">
      {/* <Header /> */}
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<React.Suspense fallback={<div>Loading...</div>}><LazyForgotPassword /></React.Suspense>} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route element={<HeaderHomeLayout />}>
          <Route path="/friends" element={<Friendship />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/groups/:groupId/members" element={<GroupMembersPage />} />
          <Route path="/active/:email/:code" element={<PathActivationPage />} />
          <Route path="/user/:id" element={<ProfileDetail />} />
          <Route
            path="/home"
            element={
              <RequireAuth>
                <Home />
              </RequireAuth>
            }
          />
          <Route
            path="/create-poster"
            element={
              <RequireAuth>
                <CreatePoster />
              </RequireAuth>
            }
          />
          <Route
            path="/change-password"
            element={
              <RequireAuth>
                <React.Suspense fallback={<div>Loading...</div>}>
                  <LazyChangePassword />
                </React.Suspense>
              </RequireAuth>
            }
          />
          <Route
            path="/poster/:posterId"
            element={
              <RequireAuth>
                <PosterDetail />
              </RequireAuth>
            }
          />
          <Route
            path="/poster/:posterId/edit"
            element={
              <RequireAuth>
                <EditPoster />
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <NotificationPage />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>

      {/* Global Gemini AI Chatbox - hiển thị ở mọi trang */}
      <GeminiChat />

      {/* <Footer /> */}
    </div>
  );
}

export default App;
