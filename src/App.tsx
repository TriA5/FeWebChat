import React from 'react';
import logo from './logo.svg';
import './App.css';
import { Route, Routes } from 'react-router-dom';
import RegisterPage from './layouts/user/RegisterPage';
import LoginPage from './layouts/user/LoginPage';
import Friendship from './layouts/user/Friendship';
import Chat from './layouts/user/Chat';
import HomePage from './layouts/Home/HomePage';
import Header from './layouts/header-footer/Header';
import Footer from './layouts/header-footer/Footer';
import PathActivationPage from './layouts/user/PathActivationPage';

function App() {
  return (
    <div className="App">
      <Header />
      <Routes>
        
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/friends" element={<Friendship />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/active/:email/:code" element={<PathActivationPage />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
