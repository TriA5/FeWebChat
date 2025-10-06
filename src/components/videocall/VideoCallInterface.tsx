import React from 'react';
import './VideoCallInterface.css';

interface VideoCallInterfaceProps {
  isVisible: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  friendName: string;
  friendAvatar?: string;
  isVideoEnabled: boolean;
  isAudioEnabled: boolean;
  callDuration: string;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onEndCall: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
}

const VideoCallInterface: React.FC<VideoCallInterfaceProps> = ({
  isVisible,
  localStream,
  remoteStream,
  friendName,
  friendAvatar,
  isVideoEnabled,
  isAudioEnabled,
  callDuration,
  onToggleVideo,
  onToggleAudio,
  onEndCall,
  onMinimize,
  isMinimized = false
}) => {
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    console.log('🎥 VideoCallInterface - localStream changed:', localStream);
    if (localVideoRef.current && localStream) {
      console.log('🎥 Setting local video srcObject');
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  React.useEffect(() => {
    console.log('🎥 VideoCallInterface - remoteStream changed:', remoteStream);
    if (remoteVideoRef.current && remoteStream) {
      console.log('🎥 Setting remote video srcObject');
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  console.log('🎥 VideoCallInterface props:', {
    isVisible,
    localStream: !!localStream,
    remoteStream: !!remoteStream,
    friendName,
    isVideoEnabled,
    isAudioEnabled,
    isMinimized
  });

  if (!isVisible) {
    console.log('🚫 VideoCallInterface not visible');
    return null;
  }

  if (isMinimized) {
    return (
      <div className="video-call-minimized" onClick={onMinimize}>
        <div className="minimized-content">
          <div className="minimized-avatar">
            {friendAvatar ? (
              <img src={friendAvatar} alt={friendName} />
            ) : (
              <div className="avatar-placeholder">{friendName.charAt(0).toUpperCase()}</div>
            )}
          </div>
          <div className="minimized-info">
            <span className="friend-name">{friendName}</span>
            <span className="call-duration">{callDuration}</span>
          </div>
          <div className="minimized-status">
            {!isVideoEnabled && <span className="status-icon">📹</span>}
            {!isAudioEnabled && <span className="status-icon">🔇</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-overlay">
      <div className="video-call-container">
        {/* Header */}
        <div className="call-header">
          <div className="call-info">
            <span className="friend-name">{friendName}</span>
            <span className="call-duration">{callDuration}</span>
          </div>
          <div className="header-actions">
            {onMinimize && (
              <button className="minimize-btn" onClick={onMinimize} title="Thu nhỏ">
                <span>−</span>
              </button>
            )}
          </div>
        </div>

        {/* Video Area */}
        <div className="video-area">
          {/* Remote Video */}
          <div className="remote-video-container">
            {remoteStream ? (
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                muted
                className="remote-video"
              />
            ) : (
              <div className="video-placeholder">
                <div className="placeholder-avatar">
                  {friendAvatar ? (
                    <img src={friendAvatar} alt={friendName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {friendName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <p>Đang kết nối...</p>
              </div>
            )}
          </div>

          {/* Local Video */}
          <div className="local-video-container">
            {localStream && isVideoEnabled ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="local-video"
              />
            ) : (
              <div className="local-video-placeholder">
                <span>📹</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="call-controls">
          <button
            className={`control-btn ${isAudioEnabled ? 'active' : 'inactive'}`}
            onClick={onToggleAudio}
            title={isAudioEnabled ? 'Tắt mic' : 'Bật mic'}
          >
            <span className="control-icon">
              {isAudioEnabled ? '🎤' : '🔇'}
            </span>
          </button>

          <button
            className={`control-btn ${isVideoEnabled ? 'active' : 'inactive'}`}
            onClick={onToggleVideo}
            title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
          >
            <span className="control-icon">
              {isVideoEnabled ? '📹' : '📷'}
            </span>
          </button>

          <button
            className="control-btn end-call-btn"
            onClick={onEndCall}
            title="Kết thúc cuộc gọi"
          >
            <span className="control-icon">📞</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;