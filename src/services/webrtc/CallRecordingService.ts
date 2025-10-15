/**
 * Call Recording Service for Group Video Calls
 * Records the combined audio/video stream of the call
 */

export interface RecordingConfig {
  mimeType?: string;
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
}

export class CallRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private startTime: Date | null = null;

  /**
   * Start recording the call
   * @param streams Array of all participant streams (local + remote)
   * @param config Recording configuration
   */
  public startRecording(
    streams: MediaStream[],
    config?: RecordingConfig
  ): void {
    if (this.isRecording) {
      console.warn('⚠️ Recording is already in progress');
      return;
    }

    try {
      // Create a combined stream from all participants
      const combinedStream = this.combineStreams(streams);

      // Determine the best mimeType
      const mimeType = this.getSupportedMimeType(config?.mimeType);

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: config?.videoBitsPerSecond || 2500000, // 2.5 Mbps
        audioBitsPerSecond: config?.audioBitsPerSecond || 128000,  // 128 kbps
      });

      // Handle data availability
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
          console.log(`📹 Recorded chunk: ${(event.data.size / 1024 / 1024).toFixed(2)} MB`);
        }
      };

      // Handle recording stop
      this.mediaRecorder.onstop = () => {
        console.log('🎬 Recording stopped');
        this.isRecording = false;
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('❌ Recording error:', event);
        this.isRecording = false;
      };

      // Start recording (request data every 10 seconds)
      this.mediaRecorder.start(10000);
      this.isRecording = true;
      this.startTime = new Date();
      this.recordedChunks = [];

      console.log('✅ Recording started with mimeType:', mimeType);
    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return the recorded blob
   */
  public async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, {
          type: this.mediaRecorder!.mimeType,
        });

        console.log(`✅ Recording complete: ${(blob.size / 1024 / 1024).toFixed(2)} MB`);

        // Cleanup
        this.isRecording = false;
        this.mediaRecorder = null;

        resolve(blob);
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Pause recording
   */
  public pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
      console.log('⏸️ Recording paused');
    }
  }

  /**
   * Resume recording
   */
  public resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
      console.log('▶️ Recording resumed');
    }
  }

  /**
   * Get recording status
   */
  public getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording duration in seconds
   */
  public getRecordingDuration(): number {
    if (!this.startTime) return 0;
    const now = new Date();
    return Math.floor((now.getTime() - this.startTime.getTime()) / 1000);
  }

  /**
   * Download the recorded video
   */
  public downloadRecording(blob: Blob, filename?: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename || this.generateFilename();
    
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log('💾 Recording downloaded:', a.download);
  }

  /**
   * Combine multiple streams into one
   */
  private combineStreams(streams: MediaStream[]): MediaStream {
    const combinedStream = new MediaStream();

    // Add all video tracks
    streams.forEach((stream) => {
      stream.getVideoTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
    });

    // Add all audio tracks
    streams.forEach((stream) => {
      stream.getAudioTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
    });

    console.log(`📹 Combined ${streams.length} streams into one`);
    return combinedStream;
  }

  /**
   * Get supported MIME type for recording
   */
  private getSupportedMimeType(preferred?: string): string {
    const mimeTypes = [
      preferred,
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ].filter(Boolean) as string[];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Fallback to default
    return '';
  }

  /**
   * Generate filename with timestamp
   */
  private generateFilename(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const extension = this.mediaRecorder?.mimeType.includes('mp4') ? 'mp4' : 'webm';
    return `group-call-${date}_${time}.${extension}`;
  }

  /**
   * Cleanup
   */
  public cleanup(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.isRecording = false;
    this.startTime = null;
  }
}
