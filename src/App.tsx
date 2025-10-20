import React from "react";
import logo from "./logo.svg";
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
        </Route>
      </Routes>

      {/* Global Gemini AI Chatbox - hiển thị ở mọi trang */}
      <GeminiChat />

      {/* <Footer /> */}
    </div>
  );
}

export default App;
