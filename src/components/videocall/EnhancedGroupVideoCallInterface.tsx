import React, { useEffect, useRef, useState } from 'react';
import './EnhancedGroupVideoCallInterface.css';
import { GroupWebRTCService } from '../../services/webrtc/GroupWebRTCService';
import { NetworkMonitor, NetworkStats } from '../../services/webrtc/NetworkMonitor';
import { ScreenSharingService } from '../../services/webrtc/ScreenSharingService';
import { CallRecordingService } from '../../services/webrtc/CallRecordingService';
import { leaveGroupCall, endGroupCall } from '../../api/videocall/groupVideoCallApi';
import { Client } from '@stomp/stompjs';

interface ParticipantInfo {
  userId: string;
  userName: string;
  userAvatar: string;
}

interface EnhancedGroupVideoCallInterfaceProps {
  callId: string;
  groupId: string;
  groupName: string;
  initiatorId: string;
  currentUserId: string;
  participants: ParticipantInfo[];
  onCallEnded: () => void;
  stompClient: Client | null;
}

interface RemoteStream {
  userId: string;
  userName: string;
  userAvatar: string;
  stream: MediaStream;
  networkQuality?: NetworkStats;
}

/**
 * Enhanced Group Video Call Interface with:
 * - Network quality monitoring
 * - Screen sharing
 * - Call recording
 * - Advanced controls
 */
const EnhancedGroupVideoCallInterface: React.FC<EnhancedGroupVideoCallInterfaceProps> = ({
  callId,
  groupId,
  groupName,
  initiatorId,
  currentUserId,
  participants,
  onCallEnded,
  stompClient
}) => {
  const [webrtcService] = useState(() => new GroupWebRTCService(stompClient));
  const [networkMonitor] = useState(() => new NetworkMonitor(handleNetworkStatsUpdate));
  const [screenSharingService] = useState(() => new ScreenSharingService());
  const [recordingService] = useState(() => new CallRecordingService());

  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'speaker'>('grid');
  const [activeSpeaker] = useState<string | null>(null); // TODO: Implement active speaker detection
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize call
  useEffect(() => {
    const initializeCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true }
        });

        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        webrtcService.initialize(stream, callId, currentUserId);

        // Create offers for existing participants
        participants.forEach((participant) => {
          if (participant.userId !== currentUserId) {
            webrtcService.createOffer(participant.userId, handleRemoteStream);
          }
        });

        // Subscribe to WebRTC signals
        if (stompClient && stompClient.connected) {
          stompClient.subscribe(`/topic/group-video-signal/${currentUserId}`, (message) => {
            const signal = JSON.parse(message.body);
            handleSignal(signal);
          });
        }

        // Start monitoring network quality for local connection
        // (We'll monitor peer connections when they're established)

      } catch (error: any) {
        console.error('Error initializing call:', error);
        alert('Không thể khởi tạo cuộc gọi: ' + error.message);
        onCallEnded();
      }
    };

    initializeCall();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      webrtcService.cleanup();
      networkMonitor.stopAll();
      screenSharingService.cleanup();
      recordingService.cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSignal = (signal: any) => {
    switch (signal.type) {
      case 'PEER_OFFER':
        webrtcService.handleOffer(signal.fromUserId, signal.data, handleRemoteStream);
        break;
      case 'PEER_ANSWER':
        webrtcService.handleAnswer(signal.fromUserId, signal.data);
        break;
      case 'ICE_CANDIDATE':
        webrtcService.handleIceCandidate(signal.fromUserId, signal.data);
        break;
      case 'USER_LEFT':
        handleUserLeft(signal.fromUserId);
        break;
      case 'CALL_ENDED':
        onCallEnded();
        break;
    }
  };

  const handleRemoteStream = (userId: string, stream: MediaStream) => {
    const participant = participants.find((p) => p.userId === userId);
    if (!participant) return;

    setRemoteStreams((prev) => {
      const filtered = prev.filter((s) => s.userId !== userId);
      return [
        ...filtered,
        {
          userId,
          userName: participant.userName,
          userAvatar: participant.userAvatar,
          stream,
        },
      ];
    });

    // Start network monitoring for this peer
    const pc = webrtcService.getPeerConnection(userId);
    if (pc) {
      networkMonitor.startMonitoring(userId, pc);
    }
  };

  function handleNetworkStatsUpdate(userId: string, stats: NetworkStats) {
    setRemoteStreams((prev) =>
      prev.map((stream) =>
        stream.userId === userId ? { ...stream, networkQuality: stats } : stream
      )
    );
  }

  const handleUserLeft = (userId: string) => {
    webrtcService.removePeer(userId);
    networkMonitor.stopMonitoring(userId);
    setRemoteStreams((prev) => prev.filter((s) => s.userId !== userId));
  };

  const handleToggleAudio = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        const peerConnections = webrtcService.getAllPeerConnections();
        screenSharingService.stopScreenShare(peerConnections);
        setIsScreenSharing(false);

        // Update local video to show camera again
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      } else {
        // Start screen sharing
        const peerConnections = webrtcService.getAllPeerConnections();
        const screenStream = await screenSharingService.startScreenShare(peerConnections);
        setIsScreenSharing(true);

        // Update local video to show screen
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
      }
    } catch (error: any) {
      console.error('Screen sharing error:', error);
      alert(error.message);
    }
  };

  const handleToggleRecording = async () => {
    try {
      if (isRecording) {
        // Stop recording
        const blob = await recordingService.stopRecording();
        setIsRecording(false);

        // Download the recording
        // eslint-disable-next-line no-restricted-globals
        if (confirm('Bạn có muốn tải xuống bản ghi không?')) {
          recordingService.downloadRecording(blob);
        }
      } else {
        // Start recording
        const allStreams = [
          localStreamRef.current!,
          ...remoteStreams.map(rs => rs.stream)
        ];
        recordingService.startRecording(allStreams);
        setIsRecording(true);
        alert('✅ Đã bắt đầu ghi hình cuộc gọi');
      }
    } catch (error: any) {
      console.error('Recording error:', error);
      alert('Lỗi ghi hình: ' + error.message);
    }
  };

  const handleLeaveCall = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      await leaveGroupCall(callId, currentUserId);
      onCallEnded();
    } catch (error) {
      console.error('Error leaving call:', error);
      onCallEnded();
    }
  };

  const handleEndCall = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      await endGroupCall(callId);
      onCallEnded();
    } catch (error) {
      console.error('Error ending call:', error);
      onCallEnded();
    }
  };

  const isCaller = currentUserId === initiatorId;

  return (
    <div className="enhanced-group-video-call-overlay">
      <div className="enhanced-group-video-call-container">
        {/* Header */}
        <div className="call-header">
          <div className="call-info">
            <span className="group-name">📹 {groupName}</span>
            <span className="participant-count">
              👥 {remoteStreams.length + 1} người
            </span>
            {isRecording && (
              <span className="recording-indicator">
                🔴 Đang ghi hình
              </span>
            )}
          </div>
          <div className="header-controls">
            <button 
              className="view-toggle-btn" 
              onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')}
              title="Chuyển đổi chế độ xem"
            >
              {viewMode === 'grid' ? '👥' : '👤'}
            </button>
            <button className="minimize-btn" onClick={onCallEnded}>−</button>
          </div>
        </div>

        {/* Video Grid */}
        <div className={`video-grid ${viewMode}`}>
          {/* Local Video */}
          <div className={`video-container local ${viewMode === 'speaker' && activeSpeaker !== currentUserId ? 'thumbnail' : ''}`}>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-element"
            />
            <div className="video-label">
              👤 Bạn {isScreenSharing && '(🖥️ Đang chia sẻ màn hình)'}
            </div>
            {!isVideoEnabled && (
              <div className="video-off-overlay">
                <span>📷</span>
              </div>
            )}
          </div>

          {/* Remote Videos */}
          {remoteStreams.map((remote) => (
            <RemoteVideoPlayer
              key={remote.userId}
              userId={remote.userId}
              userName={remote.userName}
              userAvatar={remote.userAvatar}
              stream={remote.stream}
              networkQuality={remote.networkQuality}
              isActiveSpeaker={viewMode === 'speaker' && activeSpeaker === remote.userId}
            />
          ))}
        </div>

        {/* Controls */}
        <div className="call-controls">
          <button
            className={`control-btn ${!isAudioEnabled ? 'off' : ''}`}
            onClick={handleToggleAudio}
            title={isAudioEnabled ? 'Tắt micro' : 'Bật micro'}
          >
            {isAudioEnabled ? '🎤' : '🔇'}
          </button>

          <button
            className={`control-btn ${!isVideoEnabled ? 'off' : ''}`}
            onClick={handleToggleVideo}
            title={isVideoEnabled ? 'Tắt camera' : 'Bật camera'}
          >
            {isVideoEnabled ? '📹' : '📵'}
          </button>

          <button
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={handleToggleScreenShare}
            title={isScreenSharing ? 'Dừng chia sẻ màn hình' : 'Chia sẻ màn hình'}
          >
            {isScreenSharing ? '🖥️✅' : '🖥️'}
          </button>

          <button
            className={`control-btn ${isRecording ? 'recording' : ''}`}
            onClick={handleToggleRecording}
            title={isRecording ? 'Dừng ghi hình' : 'Ghi hình cuộc gọi'}
          >
            {isRecording ? '⏹️' : '⏺️'}
          </button>

          {isCaller ? (
            <button
              className="control-btn end"
              onClick={handleEndCall}
              title="Kết thúc cuộc gọi"
            >
              ❌
            </button>
          ) : (
            <button
              className="control-btn leave"
              onClick={handleLeaveCall}
              title="Rời khỏi cuộc gọi"
            >
              🚪
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Remote Video Player Component
interface RemoteVideoPlayerProps {
  userId: string;
  userName: string;
  userAvatar: string;
  stream: MediaStream;
  networkQuality?: NetworkStats;
  isActiveSpeaker?: boolean;
}

const RemoteVideoPlayer: React.FC<RemoteVideoPlayerProps> = ({
  userId,
  userName,
  userAvatar,
  stream,
  networkQuality,
  isActiveSpeaker
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const qualityIndicator = networkQuality 
    ? NetworkMonitor.getQualityIndicator(networkQuality.quality)
    : '';

  return (
    <div className={`video-container remote ${isActiveSpeaker ? 'active-speaker' : 'thumbnail'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="video-element"
      />
      <div className="user-avatar">
        <img src={userAvatar} alt={userName} />
      </div>
      <div className="video-label">
        👤 {userName}
        {networkQuality && (
          <span 
            className="network-quality" 
            title={`${networkQuality.quality} - RTT: ${networkQuality.rtt.toFixed(0)}ms - Loss: ${(networkQuality.packetLossRate * 100).toFixed(1)}%`}
          >
            {qualityIndicator}
          </span>
        )}
      </div>
    </div>
  );
};

export default EnhancedGroupVideoCallInterface;
