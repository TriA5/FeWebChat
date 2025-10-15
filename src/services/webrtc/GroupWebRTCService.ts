import { Client } from '@stomp/stompjs';

/**
 * Group WebRTC Service
 * Manages multiple peer connections in a mesh topology
 * Each participant connects directly to every other participant
 */
export class GroupWebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;
  private stompClient: Client | null = null;
  private callId: string = '';
  private currentUserId: string = '';

  // ICE servers configuration
  private iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  };

  constructor(stompClient: Client | null) {
    this.stompClient = stompClient;
  }

  /**
   * Initialize with local stream and call info
   */
  public initialize(localStream: MediaStream, callId: string, currentUserId: string) {
    this.localStream = localStream;
    this.callId = callId;
    this.currentUserId = currentUserId;
  }

  /**
   * Create a peer connection for a specific user
   */
  private createPeerConnection(userId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.iceServers);

    // Add local tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.stompClient) {
        console.log(`📡 Sending ICE candidate to user ${userId}`);
        this.stompClient.publish({
          destination: `/app/group-video-signal`,
          body: JSON.stringify({
            callId: this.callId,
            fromUserId: this.currentUserId,
            toUserId: userId,
            type: 'ICE_CANDIDATE',
            data: event.candidate,
          }),
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'failed') {
        console.error(`Connection failed with ${userId}`);
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${userId}:`, pc.iceConnectionState);
    };

    this.peerConnections.set(userId, pc);
    return pc;
  }

  /**
   * Create and send offer to a new participant
   */
  public async createOffer(userId: string, onTrack: (userId: string, stream: MediaStream) => void) {
    try {
      console.log(`🔵 ========== CREATE OFFER TO ${userId} ==========`);
      console.log(`🔵 Current user: ${this.currentUserId}`);
      console.log(`🔵 Local stream tracks:`, this.localStream?.getTracks().length);
      
      const pc = this.createPeerConnection(userId);

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log(`🎬 ONTRACK EVENT from ${userId}:`, event.track.kind);
        console.log(`🎬 Track readyState:`, event.track.readyState);
        console.log(`🎬 Track enabled:`, event.track.enabled);
        console.log(`🎬 Streams count:`, event.streams?.length);
        
        if (event.streams && event.streams[0]) {
          console.log(`✅ Calling onTrack callback with stream ID:`, event.streams[0].id);
          onTrack(userId, event.streams[0]);
        } else {
          console.error(`❌ No streams in ontrack event!`);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log(`📞 Sending offer to user ${userId}`);
      console.log(`📞 Offer SDP type:`, offer.type);
      console.log(`🔵 ========== END CREATE OFFER ==========`);
      
      if (this.stompClient) {
        this.stompClient.publish({
          destination: `/app/group-video-signal`,
          body: JSON.stringify({
            callId: this.callId,
            fromUserId: this.currentUserId,
            toUserId: userId,
            type: 'PEER_OFFER',
            data: offer,
          }),
        });
      }
    } catch (error) {
      console.error(`❌ Error creating offer for ${userId}:`, error);
    }
  }

  /**
   * Handle incoming offer from another participant
   */
  public async handleOffer(
    fromUserId: string,
    offer: RTCSessionDescriptionInit,
    onTrack: (userId: string, stream: MediaStream) => void
  ) {
    try {
      console.log(`🟢 ========== HANDLE OFFER FROM ${fromUserId} ==========`);
      console.log(`🟢 Current user: ${this.currentUserId}`);
      console.log(`🟢 Offer type:`, offer.type);
      
      const pc = this.createPeerConnection(fromUserId);

      // Handle incoming remote tracks
      pc.ontrack = (event) => {
        console.log(`🎬 ONTRACK EVENT from ${fromUserId}:`, event.track.kind);
        console.log(`🎬 Track readyState:`, event.track.readyState);
        console.log(`🎬 Track enabled:`, event.track.enabled);
        console.log(`🎬 Streams count:`, event.streams?.length);
        
        if (event.streams && event.streams[0]) {
          console.log(`✅ Calling onTrack callback with stream ID:`, event.streams[0].id);
          onTrack(fromUserId, event.streams[0]);
        } else {
          console.error(`❌ No streams in ontrack event!`);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      console.log(`✅ Remote description set`);
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`✅ Local description (answer) set`);

      console.log(`📞 Sending answer to user ${fromUserId}`);
      console.log(`🟢 ========== END HANDLE OFFER ==========`);
      
      if (this.stompClient) {
        this.stompClient.publish({
          destination: `/app/group-video-signal`,
          body: JSON.stringify({
            callId: this.callId,
            fromUserId: this.currentUserId,
            toUserId: fromUserId,
            type: 'PEER_ANSWER',
            data: answer,
          }),
        });
      }
    } catch (error) {
      console.error(`❌ Error handling offer from ${fromUserId}:`, error);
    }
  }

  /**
   * Handle incoming answer from another participant
   */
  public async handleAnswer(fromUserId: string, answer: RTCSessionDescriptionInit) {
    try {
      console.log(`🟡 ========== HANDLE ANSWER FROM ${fromUserId} ==========`);
      
      const pc = this.peerConnections.get(fromUserId);
      if (pc) {
        console.log(`🟡 Peer connection state:`, pc.connectionState);
        console.log(`🟡 Signaling state:`, pc.signalingState);
        
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`✅ Answer received and remote description set`);
        console.log(`🟡 New signaling state:`, pc.signalingState);
      } else {
        console.error(`❌ No peer connection found for ${fromUserId}`);
        console.log(`Available connections:`, Array.from(this.peerConnections.keys()));
      }
      console.log(`🟡 ========== END HANDLE ANSWER ==========`);
    } catch (error) {
      console.error(`❌ Error handling answer from ${fromUserId}:`, error);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  public async handleIceCandidate(fromUserId: string, candidate: RTCIceCandidateInit) {
    try {
      const pc = this.peerConnections.get(fromUserId);
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`✅ ICE candidate added for ${fromUserId}`);
      } else {
        console.warn(`No peer connection for ICE candidate from ${fromUserId}`);
      }
    } catch (error) {
      console.error(`Error handling ICE candidate from ${fromUserId}:`, error);
    }
  }

  /**
   * Remove peer connection when user leaves
   */
  public removePeer(userId: string) {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
      console.log(`🚪 Removed peer connection for ${userId}`);
    }
  }

  /**
   * Get connection state for a specific peer
   */
  public getConnectionState(userId: string): string {
    const pc = this.peerConnections.get(userId);
    return pc ? pc.connectionState : 'disconnected';
  }

  /**
   * Get peer connection for a specific user
   */
  public getPeerConnection(userId: string): RTCPeerConnection | undefined {
    return this.peerConnections.get(userId);
  }

  /**
   * Get all peer connections
   */
  public getAllPeerConnections(): Map<string, RTCPeerConnection> {
    return this.peerConnections;
  }

  /**
   * Cleanup all connections
   */
  public cleanup() {
    console.log('🧹 Cleaning up all peer connections');
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
  }
}
