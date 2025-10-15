import { send as wsSend } from '../../api/websocket/stompClient';
import { VideoCallSignalDTO } from '../../api/videocall/videoCallApi';

export class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private callId: string | null = null;
  private userId: string | null = null;
  private remoteUserId: string | null = null;
  // Buffer for signals arriving before user accepts (callee path)
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  // ICE servers configuration (STUN + TURN)
private iceServers = {
  iceServers: [
    // Google STUN servers (dùng để lấy IP public)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },

    // TURN server (relay audio/video khi NAT hoặc khác mạng)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

  constructor(userId: string) {
    this.userId = userId;
  }

  private handleRemoteTrack = (event: RTCTrackEvent) => {
    const track = event.track;
    console.log('🎬 ontrack event received track:', {
      kind: track.kind,
      id: track.id,
      readyState: track.readyState,
      muted: track.muted,
      streams: event.streams?.length
    });

    // Ensure we hold a MediaStream with incoming tracks (audio + video)
    if (event.streams && event.streams[0]) {
      this.remoteStream = event.streams[0];
    } else {
      if (!this.remoteStream) {
        this.remoteStream = new MediaStream();
      }
      const exists = this.remoteStream.getTracks().some(t => t.id === track.id);
      if (!exists) {
        this.remoteStream.addTrack(track);
      }
    }

    if (track.kind === 'video') {
      const notifyVideoState = (enabled: boolean) => {
        this.onRemoteVideoStatusChanged?.(enabled);
      };

      notifyVideoState(!track.muted && track.readyState !== 'ended');
      track.onmute = () => notifyVideoState(false);
      track.onunmute = () => notifyVideoState(true);
      track.onended = () => notifyVideoState(false);
    }

    if (track.kind === 'audio') {
      const notifyAudioState = (enabled: boolean) => {
        this.onRemoteAudioStatusChanged?.(enabled);
      };

      notifyAudioState(!track.muted && track.readyState !== 'ended');
      track.onmute = () => notifyAudioState(false);
      track.onunmute = () => notifyAudioState(true);
      track.onended = () => notifyAudioState(false);
    }

    if (this.remoteStream) {
      this.onRemoteStreamReceived?.(this.remoteStream);
    }
  };

  async initializeConnection(callId: string, remoteUserId: string): Promise<void> {
    this.callId = callId;
    this.remoteUserId = remoteUserId;
    
    this.peerConnection = new RTCPeerConnection(this.iceServers);
    
    // Set up event handlers
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callId && this.remoteUserId) {
        this.sendSignal({
          callId: this.callId,
          fromUserId: this.userId!,
          toUserId: this.remoteUserId,
          type: 'ICE_CANDIDATE',
          data: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = this.handleRemoteTrack;

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        this.onCallConnected?.();
      } else if (this.peerConnection?.connectionState === 'disconnected') {
        this.onCallDisconnected?.();
      }
    };
  }

  async startCall(): Promise<void> {
    try {
      console.log('🎥 Requesting user media...');
      this.localStream = await this.acquireMediaWithFallback('caller');
      
      console.log('✅ User media obtained:', this.localStream);
      this.onLocalStreamReceived?.(this.localStream);

      if (this.peerConnection && this.localStream) {
        // Add local stream to peer connection
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });

        // Create and send offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        
        if (this.callId && this.remoteUserId) {
          this.sendSignal({
            callId: this.callId,
            fromUserId: this.userId!,
            toUserId: this.remoteUserId,
            type: 'CALL_OFFER',
            data: offer
          });
        }
      }
    } catch (error) {
      console.error('❌ Error starting call:', error);
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          console.error('❌ Camera/microphone access denied');
        } else if (error.name === 'NotFoundError') {
          console.error('❌ Camera/microphone not found');
        }
      }
      this.onError?.(error as Error);
      throw error; // Re-throw để caller có thể handle
    }
  }

  async answerCall(): Promise<void> {
    try {
      console.log('🎥 Answering call - requesting user media...');
      this.localStream = await this.acquireMediaWithFallback('callee');
      
      console.log('✅ User media obtained for answer:', this.localStream);
      this.onLocalStreamReceived?.(this.localStream);

      if (this.peerConnection && this.localStream) {
        // Add local stream to peer connection
        this.localStream.getTracks().forEach(track => {
          this.peerConnection!.addTrack(track, this.localStream!);
        });
        // If we buffered an offer (because it arrived before user accepted), process it now
        if (this.pendingOffer) {
          console.log('📦 Processing buffered offer now that local media is ready');
          await this.peerConnection.setRemoteDescription(this.pendingOffer);
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          if (this.callId && this.remoteUserId) {
            this.sendSignal({
              callId: this.callId,
              fromUserId: this.userId!,
              toUserId: this.remoteUserId,
              type: 'CALL_ANSWER',
              data: answer
            });
          }
          // Flush buffered ICE candidates (received before remoteDescription set)
          if (this.pendingIceCandidates.length > 0) {
            console.log('🧊 Adding buffered ICE candidates:', this.pendingIceCandidates.length);
            for (const c of this.pendingIceCandidates) {
              try { await this.peerConnection.addIceCandidate(c); } catch (e) { console.warn('Failed to add buffered ICE', e); }
            }
            this.pendingIceCandidates = [];
          }
          this.pendingOffer = null;
        }
      }
    } catch (error) {
      console.error('Error answering call:', error);
      this.onError?.(error as Error);
    }
  }

  /**
   * Try to get user media with progressive fallback & better error mapping.
   * 1. HD constraints
   * 2. Lower resolution
   * 3. Audio only (still allow joining call to listen)
   */
  private async acquireMediaWithFallback(role: 'caller' | 'callee'): Promise<MediaStream> {
    const attempts: Array<MediaStreamConstraints> = [
      { video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }, audio: true },
      { video: { width: { ideal: 640 }, height: { ideal: 360 }, frameRate: { ideal: 24 } }, audio: true },
      { video: true, audio: true },
      { audio: true } // last fallback
    ];

    let lastError: any = null;
    for (let i = 0; i < attempts.length; i++) {
      const c = attempts[i];
      try {
        console.log(`🎛️ getUserMedia attempt ${i + 1}/${attempts.length} (${role}) constraints:`, c);
        const stream = await navigator.mediaDevices.getUserMedia(c);
        if (c.video && (stream.getVideoTracks().length === 0)) {
          console.warn('⚠️ No video tracks despite video constraint, trying next fallback');
          lastError = new Error('No video track returned');
          continue;
        }
        console.log('✅ Media acquired with constraint index', i);
        return stream;
      } catch (err: any) {
        lastError = err;
        console.warn(`❌ getUserMedia failed (attempt ${i + 1})`, err?.name || err);
        // If permission denied, abort early – user needs to take action
        if (err && (err.name === 'NotAllowedError' || err.name === 'SecurityError')) break;
        // If device busy (NotReadableError) we can retry lower profile once
        if (err && err.name === 'NotReadableError') continue;
      }
    }

    // Build human friendly message
    let friendly = 'Không thể truy cập thiết bị media.';
    if (lastError) {
      switch (lastError.name) {
        case 'NotAllowedError':
          friendly = 'Bạn đã chặn quyền camera/micro. Hãy mở lại quyền trong trình duyệt rồi thử lại.';
          break;
        case 'NotFoundError':
          friendly = 'Không tìm thấy camera hoặc micro. Kiểm tra kết nối thiết bị.';
          break;
        case 'NotReadableError':
          friendly = 'Thiết bị đang bị ứng dụng khác sử dụng (ví dụ: Zoom, Teams, tab khác). Đóng các ứng dụng đó rồi thử lại.';
          break;
        case 'OverconstrainedError':
          friendly = 'Camera không đáp ứng được cấu hình yêu cầu. Đang dùng thiết lập quá cao.';
          break;
        default:
          friendly = `Lỗi media: ${lastError.name || lastError.message || lastError}`;
      }
    }
    const finalError = new Error(friendly);
    this.onError?.(finalError);
    throw finalError;
  }

  async handleSignal(signal: VideoCallSignalDTO): Promise<void> {
    // If we haven't initialized yet (callee may receive offer before accept), create bare peerConnection
    if (!this.peerConnection) {
      if (signal.type === 'CALL_OFFER' && signal.toUserId === this.userId) {
        console.log('🧪 Creating peer connection on first incoming offer (pre-accept)');
        // Initialize minimal connection without local tracks
        this.callId = signal.callId;
        this.remoteUserId = signal.fromUserId;
        this.peerConnection = new RTCPeerConnection(this.iceServers);
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate && this.callId && this.remoteUserId) {
            // Only send ICE after user accepted (i.e., has localStream) to avoid leaking before consent
            if (this.localStream) {
              this.sendSignal({
                callId: this.callId,
                fromUserId: this.userId!,
                toUserId: this.remoteUserId,
                type: 'ICE_CANDIDATE',
                data: event.candidate
              });
            }
          }
        };
        this.peerConnection.ontrack = this.handleRemoteTrack;
        this.peerConnection.onconnectionstatechange = () => {
          console.log('Connection state:', this.peerConnection?.connectionState);
          if (this.peerConnection?.connectionState === 'connected') {
            this.onCallConnected?.();
          } else if (this.peerConnection?.connectionState === 'disconnected') {
            this.onCallDisconnected?.();
          }
        };
      } else {
        // Ignore other signals until connection exists
        return;
      }
    }

    try {
      switch (signal.type) {
        case 'CALL_OFFER':
          // If we already have local media (caller path or callee already accepted), answer immediately
          if (this.localStream) {
            console.log('📨 Received offer & we have local media: answering now');
            await this.peerConnection!.setRemoteDescription(signal.data);
            const answerNow = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answerNow);
            this.sendSignal({
              callId: signal.callId,
              fromUserId: this.userId!,
              toUserId: signal.fromUserId,
              type: 'CALL_ANSWER',
              data: answerNow
            });
          } else {
            console.log('📦 Buffering offer until user accepts / local media ready');
            this.pendingOffer = signal.data;
          }
          break;

        case 'CALL_ANSWER':
          await this.peerConnection.setRemoteDescription(signal.data);
          if (this.pendingIceCandidates.length > 0) {
            console.log('🧊 Flushing buffered ICE candidates after answer:', this.pendingIceCandidates.length);
            for (const c of this.pendingIceCandidates) {
              try { await this.peerConnection.addIceCandidate(c); } catch (e) { console.warn('Failed to add buffered ICE', e); }
            }
            this.pendingIceCandidates = [];
          }
          break;

        case 'ICE_CANDIDATE':
          if (this.peerConnection.remoteDescription) {
            await this.peerConnection.addIceCandidate(signal.data);
          } else {
            console.log('🧊 Buffering ICE candidate until remoteDescription set');
            this.pendingIceCandidates.push(signal.data);
          }
          break;

        case 'CALL_END':
          this.endCall();
          break;
      }
    } catch (error) {
      console.error('Error handling signal:', error);
      this.onError?.(error as Error);
    }
  }

  acceptCall(): void {
    if (this.callId && this.remoteUserId) {
      this.sendSignal({
        callId: this.callId,
        fromUserId: this.userId!,
        toUserId: this.remoteUserId,
        type: 'CALL_ACCEPT'
      });
    }
  }

  rejectCall(): void {
    if (this.callId && this.remoteUserId) {
      this.sendSignal({
        callId: this.callId,
        fromUserId: this.userId!,
        toUserId: this.remoteUserId,
        type: 'CALL_REJECT'
      });
    }
    this.cleanup();
  }

  endCall(): void {
    if (this.callId && this.remoteUserId) {
      this.sendSignal({
        callId: this.callId,
        fromUserId: this.userId!,
        toUserId: this.remoteUserId,
        type: 'CALL_END'
      });
    }
    this.cleanup();
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled; // Return true if muted
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled; // Return true if video is off
      }
    }
    return false;
  }

  private sendSignal(signal: VideoCallSignalDTO): void {
    wsSend('/app/video-call.signal', signal);
  }

  private cleanup(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.remoteStream = null;
    this.callId = null;
    this.remoteUserId = null;
    
    this.onCallEnded?.();
  }

  // Event handlers (to be set by the UI component)
  onLocalStreamReceived?: (stream: MediaStream) => void;
  onRemoteStreamReceived?: (stream: MediaStream | null) => void;
  onRemoteVideoStatusChanged?: (enabled: boolean) => void;
  onRemoteAudioStatusChanged?: (enabled: boolean) => void;
  onCallConnected?: () => void;
  onCallDisconnected?: () => void;
  onCallEnded?: () => void;
  onError?: (error: Error) => void;

  // Getters
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  isConnected(): boolean {
    return this.peerConnection?.connectionState === 'connected';
  }
 private ensureLocalTracksAdded(): void {
  if (!this.peerConnection) {
    console.warn('⚠️ peerConnection chưa tạo — khởi tạo mới...');
    this.peerConnection = new RTCPeerConnection(this.iceServers);

    // Đăng ký lại event listeners quan trọng
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.callId && this.remoteUserId) {
        this.sendSignal({
          callId: this.callId,
          fromUserId: this.userId!,
          toUserId: this.remoteUserId,
          type: 'ICE_CANDIDATE',
          data: event.candidate
        });
      }
    };

    this.peerConnection.ontrack = this.handleRemoteTrack;
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        this.onCallConnected?.();
      } else if (this.peerConnection?.connectionState === 'disconnected') {
        this.onCallDisconnected?.();
      }
    };
  }

  if (!this.localStream) {
    console.warn('⚠️ Chưa có localStream để add track');
    return;
  }

  const tracks = this.localStream.getTracks();
  if (tracks.length === 0) {
    console.warn('⚠️ localStream không có track nào để add');
    return;
  }

  const senders = this.peerConnection.getSenders();

  tracks.forEach(track => {
    const existingSender = senders.find(s => s.track && s.track.kind === track.kind);

    if (existingSender) {
      // Nếu track cùng loại đã tồn tại (ví dụ video), thì chỉ thay track đó thôi
      if (existingSender.track?.id !== track.id) {
        console.log(`🔄 Thay thế track ${track.kind}`);
        existingSender.replaceTrack(track).catch(err => {
          console.warn(`replaceTrack(${track.kind}) lỗi:`, err);
        });
      }
    } else {
      // Nếu chưa có, thêm mới
      console.log(`➕ Thêm track ${track.kind}`);
      try {
        if (this.peerConnection) {
          this.peerConnection.addTrack(track, this.localStream!);
        } else {
          console.warn('❌ peerConnection is null, cannot add track');
        }
      } catch (err) {
        console.error(`❌ addTrack(${track.kind}) lỗi:`, err);
      }
    }
  });
}

}