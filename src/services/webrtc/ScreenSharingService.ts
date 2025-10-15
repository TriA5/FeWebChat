/**
 * Screen Sharing Service for Group Video Calls
 * Allows users to share their screen during video calls
 */

export class ScreenSharingService {
  private screenStream: MediaStream | null = null;
  private originalVideoTrack: MediaStreamTrack | null = null;
  private isSharing: boolean = false;

  /**
   * Start screen sharing
   * Replaces the video track in all peer connections
   */
  public async startScreenShare(
    peerConnections: Map<string, RTCPeerConnection>
  ): Promise<MediaStream> {
    try {
      // Get screen share stream
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          // @ts-ignore - cursor is a valid property for screen capture
          cursor: 'always',
          displaySurface: 'monitor',
        } as MediaTrackConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const screenVideoTrack = this.screenStream.getVideoTracks()[0];
      const screenAudioTrack = this.screenStream.getAudioTracks()[0];

      // Handle when user stops sharing via browser UI
      screenVideoTrack.onended = () => {
        console.log('📺 Screen sharing stopped by user');
        this.stopScreenShare(peerConnections);
      };

      // Replace video track in all peer connections
      peerConnections.forEach((pc, userId) => {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          // Save original track to restore later
          if (!this.originalVideoTrack) {
            this.originalVideoTrack = videoSender.track;
          }

          videoSender.replaceTrack(screenVideoTrack);
          console.log(`📺 Replaced video track with screen for user ${userId}`);
        }

        // Add audio track if available
        if (screenAudioTrack) {
          const audioSender = pc.getSenders().find((s) => s.track?.kind === 'audio');
          if (audioSender) {
            // Mix screen audio with mic audio (advanced feature)
            // For now, just replace
            audioSender.replaceTrack(screenAudioTrack);
          }
        }
      });

      this.isSharing = true;
      console.log('✅ Screen sharing started');

      return this.screenStream;
    } catch (error: any) {
      console.error('❌ Failed to start screen sharing:', error);

      let errorMessage = 'Không thể chia sẻ màn hình. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Bạn đã từ chối quyền chia sẻ màn hình.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'Không tìm thấy nguồn chia sẻ màn hình.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Không thể truy cập nguồn chia sẻ màn hình.';
      } else {
        errorMessage += error.message;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Stop screen sharing
   * Restores the original camera video track
   */
  public stopScreenShare(peerConnections: Map<string, RTCPeerConnection>): void {
    if (!this.isSharing) {
      console.warn('⚠️ Screen sharing is not active');
      return;
    }

    // Stop screen stream tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => {
        track.stop();
        console.log('🛑 Stopped screen track:', track.kind);
      });
      this.screenStream = null;
    }

    // Restore original video track in all peer connections
    if (this.originalVideoTrack) {
      peerConnections.forEach((pc, userId) => {
        const videoSender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(this.originalVideoTrack!);
          console.log(`📹 Restored camera video for user ${userId}`);
        }
      });

      this.originalVideoTrack = null;
    }

    this.isSharing = false;
    console.log('✅ Screen sharing stopped');
  }

  /**
   * Check if currently sharing screen
   */
  public getIsSharing(): boolean {
    return this.isSharing;
  }

  /**
   * Get the screen stream (if sharing)
   */
  public getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  /**
   * Cleanup (called when leaving call)
   */
  public cleanup(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }
    this.originalVideoTrack = null;
    this.isSharing = false;
  }
}
