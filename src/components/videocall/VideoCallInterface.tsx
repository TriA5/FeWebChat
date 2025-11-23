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
  const remoteAudioRef = React.useRef<HTMLAudioElement>(null);

  // ---------------- Local Video ----------------
  React.useEffect(() => {
    if (!localVideoRef.current) return;

    if (localStream && isVideoEnabled) {
      localVideoRef.current.srcObject = localStream;
    } else {
      localVideoRef.current.srcObject = null;
    }
  }, [localStream, isVideoEnabled]);

  // ---------------- Remote Video ----------------
  React.useEffect(() => {
    if (!remoteVideoRef.current) return;

    if (remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;

      // Gán lại mỗi khi track mới được thêm vào
      remoteStream.onaddtrack = (e) => {
        console.log('🎥 Remote track added:', e.track.kind);
        remoteVideoRef.current!.srcObject = remoteStream;
      };
    }
  }, [remoteStream]);

  // ---------------- Remote Audio ----------------
  React.useEffect(() => {
    if (!remoteAudioRef.current) return;
    const audioEl = remoteAudioRef.current;

    if (remoteStream) {
      audioEl.srcObject = remoteStream;

      const tryPlay = () => {
        audioEl.play().catch(err => {
          console.warn('⚠️ Cannot autoplay remote audio:', err);
        });
      };
      tryPlay();

      // Bắt lại sự kiện khi remote thêm track audio
      remoteStream.onaddtrack = (e) => {
        if (e.track.kind === 'audio') {
          console.log('🎧 Remote audio added');
          tryPlay();
        }
      };
    }
  }, [remoteStream]);

  if (!isVisible) return null;

  if (isMinimized) {
    return (
      <div className="video-call-minimized" onClick={onMinimize}>
        <div className="minimized-content">
          <div className="minimized-avatar">
            {friendAvatar ? (
              <img src={friendAvatar} alt={friendName} />
            ) : (
              <div className="avatar-placeholder">
                {friendName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="minimized-info">
            <span className="friend-name">{friendName}</span>
            <span className="call-duration">{callDuration}</span>
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
          {onMinimize && (
            <button className="minimize-btn" onClick={onMinimize}>−</button>
          )}
        </div>

        {/* Video Area */}
        <div className="video-area">
          {/* Remote Video */}
          <div className="remote-video-container">
            {remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="remote-video"
                  style={{ width: '85%' }}
                />
                <audio ref={remoteAudioRef} autoPlay playsInline />
              </>
            ) : (
              <div className="video-placeholder">
                {friendAvatar ? (
                  <img src={friendAvatar} alt={friendName} />
                ) : (
                  <div className="avatar-placeholder">
                    {friendName.charAt(0).toUpperCase()}
                  </div>
                )}
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
            {isAudioEnabled ? '🎤' : '🔇'}
          </button>

          <button
            className={`control-btn ${isVideoEnabled ? 'active' : 'inactive'}`}
            onClick={onToggleVideo}
            title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
          >
            {isVideoEnabled ? '📹' : '📷'}
          </button>

          <button
            className="control-btn end-call-btn"
            onClick={onEndCall}
            title="Kết thúc"
          >
            📞
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallInterface;
