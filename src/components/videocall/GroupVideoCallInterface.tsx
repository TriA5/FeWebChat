import React, { useEffect, useRef, useState, useCallback } from 'react';
import './GroupVideoCallInterface.css';
import { GroupWebRTCService } from '../../services/webrtc/GroupWebRTCService';
import { leaveGroupCall, endGroupCall } from '../../api/videocall/groupVideoCallApi';
import { Client } from '@stomp/stompjs';

interface ParticipantInfo {
  userId: string;
  userName: string;
  userAvatar: string;
}

interface GroupVideoCallInterfaceProps {
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
}

const GroupVideoCallInterface: React.FC<GroupVideoCallInterfaceProps> = ({
  callId,
  groupId,
  groupName,
  initiatorId,
  currentUserId,
  participants,
  onCallEnded,
  stompClient,
}) => {
  const [webrtcService] = useState(() => new GroupWebRTCService(stompClient));
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionStates, setConnectionStates] = useState<Map<string, string>>(new Map());
  const [activeParticipants, setActiveParticipants] = useState<ParticipantInfo[]>(participants);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Debug log
  console.log('🎬 GroupVideoCallInterface mounted with:');
  console.log('  Current User ID:', currentUserId);
  console.log('  Participants:', participants);
  console.log('  Call ID:', callId);

  useEffect(() => {
    const initializeCall = async () => {
      try {
        // Get real camera/microphone
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });

        // Save stream to ref for cleanup
        localStreamRef.current = stream;

        // Display local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Initialize WebRTC service
        webrtcService.initialize(stream, callId, currentUserId);

        // Create offers for existing participants
        console.log('👥 Creating offers for existing participants...');
        console.log('Total participants:', participants.length);
        console.log('Current user:', currentUserId);
        
        let offersCreated = 0;
        participants.forEach((participant) => {
          console.log('Checking participant:', participant.userId, participant.userName);
          if (participant.userId !== currentUserId) {
            console.log('✅ Creating offer to:', participant.userName);
            webrtcService.createOffer(participant.userId, handleRemoteStream);
            offersCreated++;
          } else {
            console.log('⏭️ Skipping self:', participant.userName);
          }
        });
        
        console.log(`📊 Created ${offersCreated} offers for existing participants`);

      } catch (error: any) {
        console.error('Error initializing call:', error);
        let errorMessage = 'Không thể khởi tạo cuộc gọi. ';
        
        if (error.name === 'NotAllowedError') {
          errorMessage += 'Bạn đã từ chối quyền truy cập camera/microphone. Vui lòng cho phép quyền truy cập và thử lại.';
        } else if (error.name === 'NotFoundError') {
          errorMessage += 'Không tìm thấy camera hoặc microphone. Vui lòng kiểm tra thiết bị của bạn.';
        } else if (error.name === 'NotReadableError') {
          errorMessage += 'Camera/microphone đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.';
        } else if (error.name === 'OverconstrainedError') {
          errorMessage += 'Không thể đáp ứng yêu cầu camera/microphone. Vui lòng thử lại.';
        } else if (error.name === 'TypeError') {
          errorMessage += 'Trình duyệt không hỗ trợ truy cập camera/microphone.';
        } else {
          errorMessage += error.message;
        }
        
        alert(errorMessage);
        onCallEnded();
      }
    };

    initializeCall();

    return () => {
      // Cleanup local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped track:', track.kind);
        });
        localStreamRef.current = null;
      }
      // Cleanup WebRTC connections
      webrtcService.cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callId, groupId, currentUserId, participants, stompClient, onCallEnded, webrtcService]);

  // handleRemoteStream must be defined before handleSignal
  const handleRemoteStream = useCallback((userId: string, stream: MediaStream) => {
    console.log('🎥 ====================================');
    console.log('🎥 REMOTE STREAM RECEIVED');
    console.log('🎥 User ID:', userId);
    console.log('🎥 Stream ID:', stream.id);
    console.log('🎥 Stream active:', stream.active);
    console.log('🎥 Video tracks:', stream.getVideoTracks().length);
    console.log('🎥 Audio tracks:', stream.getAudioTracks().length);
    
    const participant = activeParticipants.find(p => p.userId === userId);
    if (!participant) {
      console.error(' ❌ Participant not found for userId:', userId);
      console.log('Available activeParticipants:', activeParticipants);
      return;
    }

    console.log('✅ Participant found:', participant.userName);

    setRemoteStreams((prev) => {
      // Remove existing stream for this user if any
      const filtered = prev.filter((s) => s.userId !== userId);
      const newStreams = [
        ...filtered,
        {
          userId,
          userName: participant.userName,
          userAvatar: participant.userAvatar,
          stream,
        },
      ];
      console.log('📊 Remote streams count:', newStreams.length);
      return newStreams;
    });

    // Update connection state
    setConnectionStates((prev) => {
      const newMap = new Map(prev);
      newMap.set(userId, webrtcService.getConnectionState(userId));
      return newMap;
    });
    
    console.log('🎥 ====================================');
  }, [activeParticipants, webrtcService]);

  const handleUserLeft = useCallback((userId: string) => {
    console.log('👋 User left:', userId);
    webrtcService.removePeer(userId);
    setRemoteStreams((prev) => prev.filter((s) => s.userId !== userId));
    setConnectionStates((prev) => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  }, [webrtcService]);

  // Define handleSignal with useCallback to prevent re-subscriptions
  const handleSignal = useCallback((signal: any) => {
    console.log('📨 ========================================');
    console.log('📨 SIGNAL RECEIVED:', signal.type);
    console.log('📨 From:', signal.fromUserId);
    console.log('📨 To:', signal.toUserId);
    console.log('📨 Current user:', currentUserId);
    
    switch (signal.type) {
      case 'PEER_OFFER':
        console.log('📨 Processing PEER_OFFER...');
        webrtcService.handleOffer(signal.fromUserId, signal.data, handleRemoteStream);
        break;
      case 'PEER_ANSWER':
        console.log('📨 Processing PEER_ANSWER...');
        webrtcService.handleAnswer(signal.fromUserId, signal.data);
        break;
      case 'ICE_CANDIDATE':
        console.log('📨 Processing ICE_CANDIDATE...');
        webrtcService.handleIceCandidate(signal.fromUserId, signal.data);
        break;
      case 'USER_JOINED':
        console.log('👤 USER_JOINED - Creating offer to new user:', signal.fromUserId);
        if (signal.fromUserId !== currentUserId && signal.data) {
          // Add new participant to state
          const newParticipant: ParticipantInfo = {
            userId: signal.data.userId,
            userName: signal.data.userName,
            userAvatar: signal.data.userAvatar
          };
          console.log('➕ Adding participant to state:', newParticipant);
          setActiveParticipants(prev => {
            // Check if participant already exists
            if (prev.some(p => p.userId === newParticipant.userId)) {
              console.log('⚠️ Participant already exists, skipping');
              return prev;
            }
            const updated = [...prev, newParticipant];
            console.log('✅ Updated participants:', updated);
            return updated;
          });
          
          webrtcService.createOffer(signal.fromUserId, handleRemoteStream);
        } else {
          console.log('⏭️ Skipping - user is self');
        }
        break;
      case 'USER_LEFT':
        console.log('👋 USER_LEFT:', signal.fromUserId);
        handleUserLeft(signal.fromUserId);
        break;
      case 'CALL_ENDED':
        console.log('📞 CALL_ENDED');
        onCallEnded();
        break;
      default:
        console.warn('⚠️ Unknown signal type:', signal.type);
    }
    console.log('📨 ========================================');
  }, [currentUserId, webrtcService, handleRemoteStream, handleUserLeft, onCallEnded]);

  // Subscribe to WebRTC signals - CRITICAL: Must be after handleSignal is defined!
  useEffect(() => {
    if (!stompClient || !stompClient.connected) {
      console.warn('⚠️ StompClient not connected, cannot subscribe to signals');
      return;
    }

    console.log('🔔 Setting up WebRTC signal subscriptions...');
    
    // Subscribe to user-specific signals (PEER_OFFER, PEER_ANSWER, ICE_CANDIDATE)
    const userSignalSub = stompClient.subscribe(
      `/topic/group-video-signal/${currentUserId}`,
      (message) => {
        const signal = JSON.parse(message.body);
        console.log('📨 User-specific signal received:', signal.type);
        handleSignal(signal);
      }
    );
    console.log('✅ Subscribed to user signals:', `/topic/group-video-signal/${currentUserId}`);

    // Subscribe to group-wide signals (USER_JOINED, USER_LEFT, CALL_ENDED)
    const groupSignalSub = stompClient.subscribe(
      `/topic/group-video-call/${groupId}`,
      (message) => {
        const signal = JSON.parse(message.body);
        console.log('📢 Group-wide signal received:', signal.type);
        
        // Only process USER_JOINED, USER_LEFT, CALL_ENDED
        // CALL_INITIATED is handled by Chat.tsx
        if (signal.type === 'USER_JOINED' || signal.type === 'USER_LEFT' || signal.type === 'CALL_ENDED') {
          handleSignal(signal);
        }
      }
    );
    console.log('✅ Subscribed to group signals:', `/topic/group-video-call/${groupId}`);

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🧹 Cleaning up WebRTC signal subscriptions');
      userSignalSub?.unsubscribe();
      groupSignalSub?.unsubscribe();
    };
  }, [stompClient, currentUserId, groupId, handleSignal]);

  const handleToggleAudio = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const handleToggleVideo = () => {
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const stream = localVideoRef.current.srcObject as MediaStream;
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  const handleLeaveCall = async () => {
    try {
      // Stop local stream first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped track on leave:', track.kind);
        });
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
      // Stop local stream first
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log('🛑 Stopped track on end:', track.kind);
        });
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
    <div className="group-video-call-overlay">
      <div className="group-video-call-container">
        {/* Header */}
        <div className="call-header">
          <div className="call-info">
            <span className="group-name">📹 {groupName}</span>
            <span className="participant-count">
              👥 {remoteStreams.length + 1} người
            </span>
          </div>
          <button className="minimize-btn" onClick={onCallEnded}>
            −
          </button>
        </div>

        {/* Video Grid */}
        <div className="video-grid">
          {/* Local Video */}
          <div className="video-container local">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="video-element"
            />
            <div className="video-label">👤 Bạn</div>
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
              connectionState={connectionStates.get(remote.userId) || 'connecting'}
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

          {/* Only initiator sees "End Call" button, others see "Leave" button */}
          {isCaller ? (
            <button
              className="control-btn end"
              onClick={handleEndCall}
              title="Kết thúc cuộc gọi cho tất cả"
            >
              ❌ Kết thúc
            </button>
          ) : (
            <button
              className="control-btn leave"
              onClick={handleLeaveCall}
              title="Rời khỏi cuộc gọi"
            >
              🚪 Rời
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Component for rendering remote video player
interface RemoteVideoPlayerProps {
  userId: string;
  userName: string;
  userAvatar: string;
  stream: MediaStream;
  connectionState: string;
}

const RemoteVideoPlayer: React.FC<RemoteVideoPlayerProps> = ({
  userId,
  userName,
  userAvatar,
  stream,
  connectionState
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    console.log('📺 RemoteVideoPlayer useEffect for:', userName);
    console.log('📺 Video ref:', videoRef.current ? 'exists' : 'null');
    console.log('📺 Stream:', stream ? stream.id : 'null');
    
    if (videoRef.current && stream) {
      console.log('✅ Setting srcObject for:', userName);
      console.log('📺 Stream active:', stream.active);
      console.log('📺 Video tracks:', stream.getVideoTracks().length);
      console.log('📺 Audio tracks:', stream.getAudioTracks().length);
      
      videoRef.current.srcObject = stream;
      
      // Add event listeners to debug
      videoRef.current.onloadedmetadata = () => {
        console.log('✅ Video metadata loaded for:', userName);
      };
      
      videoRef.current.onplay = () => {
        console.log('▶️ Video playing for:', userName);
      };
      
      videoRef.current.onerror = (e) => {
        console.error('❌ Video error for:', userName, e);
      };
    } else {
      console.warn('⚠️ Cannot set srcObject - ref or stream missing');
    }
  }, [stream, userName]);

  return (
    <div className="video-container remote">
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
        {connectionState !== 'connected' && (
          <span className="connection-status"> ({connectionState})</span>
        )}
      </div>
    </div>
  );
};

export default GroupVideoCallInterface;
