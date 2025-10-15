import React, { useState, useRef, useEffect } from 'react';
import { askGemini, validatePrompt } from '../../api/gemini/geminiApi';
import { Send, Bot, User, Loader2, Sparkles, X, MessageCircle } from 'lucide-react';
import './GeminiChat.css';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const GeminiChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedInput = input.trim();
    const validationError = validatePrompt(trimmedInput);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: trimmedInput,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      // Call Gemini API
      const aiResponse = await askGemini(trimmedInput);
      
      // Add AI response
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error asking Gemini:', error);
      
      // Add error message as AI response
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: `Xin lỗi, đã có lỗi xảy ra: ${error.message || 'Không thể kết nối với AI'}`,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const clearChat = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      setMessages([]);
      setError('');
      inputRef.current?.focus();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          type="button"
          className="gemini-chat__toggle"
          onClick={() => setIsOpen(true)}
          aria-label="Mở ChatBook"
        >
          <MessageCircle size={24} strokeWidth={1.8} />
        </button>
      )}

      {/* Chatbox */}
      {isOpen && (
        <div className="gemini-chat">
          <div className="gemini-chat__container">
        {/* Header */}
        <header className="gemini-chat__header">
          <div className="gemini-chat__header-content">
            <div className="gemini-chat__header-icon">
              <Sparkles size={24} strokeWidth={1.8} />
            </div>
            <div className="gemini-chat__header-text">
              <h1>ChatBook Assistant</h1>
              <p>Trợ lý AI thông minh - Hỏi bất cứ điều gì</p>
            </div>
          </div>
          {/* {messages.length > 0 && (
            <button
              type="button"
              className="gemini-chat__clear-btn"
              onClick={clearChat}
              title="Xóa lịch sử chat"
            >
              Xóa chat
            </button>
          )} */}
        </header>

        {/* Messages Area */}
        <div className="gemini-chat__messages">
          {messages.length === 0 ? (
            <div className="gemini-chat__empty">
              <div className="gemini-chat__empty-icon">
                <Bot size={64} strokeWidth={1} />
              </div>
              <h2>Chào mừng đến với ChatBook</h2>
              <p>Đặt câu hỏi của bạn và nhận câu trả lời thông minh từ AI</p>
              <div className="gemini-chat__suggestions">
                <button
                  type="button"
                  onClick={() => setInput('Hãy giải thích về trí tuệ nhân tạo')}
                >
                  Trí tuệ nhân tạo là gì?
                </button>
                <button
                  type="button"
                  onClick={() => setInput('Cách học lập trình hiệu quả')}
                >
                  Học lập trình như thế nào?
                </button>
                <button
                  type="button"
                  onClick={() => setInput('Lời khuyên cho người mới bắt đầu')}
                >
                  Lời khuyên cho newbie
                </button>
              </div>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`gemini-chat__message gemini-chat__message--${message.sender}`}
                >
                  <div className="gemini-chat__message-avatar">
                    {message.sender === 'ai' ? (
                      <Bot size={20} strokeWidth={1.6} />
                    ) : (
                      <User size={20} strokeWidth={1.6} />
                    )}
                  </div>
                  <div className="gemini-chat__message-content">
                    <div className="gemini-chat__message-header">
                      <span className="gemini-chat__message-sender">
                        {message.sender === 'ai' ? 'ChatBook' : 'Bạn'}
                      </span>
                      <span className="gemini-chat__message-time">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <div className="gemini-chat__message-text">
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="gemini-chat__message gemini-chat__message--ai gemini-chat__message--loading">
                  <div className="gemini-chat__message-avatar">
                    <Bot size={20} strokeWidth={1.6} />
                  </div>
                  <div className="gemini-chat__message-content">
                    <div className="gemini-chat__message-header">
                      <span className="gemini-chat__message-sender">ChatBook</span>
                    </div>
                    <div className="gemini-chat__message-text">
                      <Loader2 size={18} className="gemini-chat__spinner" />
                      <span>Đang suy nghĩ...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Form */}
        <form className="gemini-chat__form" onSubmit={handleSubmit}>
          {error && (
            <div className="gemini-chat__error">
              {error}
            </div>
          )}
          <div className="gemini-chat__input-wrapper">
            <textarea
              ref={inputRef}
              className="gemini-chat__input"
              placeholder="Nhập câu hỏi của bạn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
              type="submit"
              className="gemini-chat__send-btn"
              disabled={isLoading || !input.trim()}
              title="Gửi câu hỏi"
            >
              {isLoading ? (
                <Loader2 size={20} className="gemini-chat__spinner" />
              ) : (
                <Send size={20} strokeWidth={1.8} />
              )}
            </button>
          </div>
        </form>

        {/* Close Button */}
        <button
          type="button"
          className="gemini-chat__close"
          onClick={() => setIsOpen(false)}
          aria-label="Đóng chatbox"
          title="Đóng"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
      </div>
    </div>
      )}
    </>
  );
};

export default GeminiChat;
