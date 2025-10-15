/**
 * Network Quality Monitor for WebRTC Connections
 * Monitors packet loss, jitter, bandwidth, and connection quality
 */

export interface NetworkStats {
  userId: string;
  quality: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  packetsLost: number;
  packetsReceived: number;
  packetLossRate: number;
  jitter: number;
  bandwidth: number;
  rtt: number; // Round-trip time
  timestamp: Date;
}

export class NetworkMonitor {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private onStatsUpdate?: (userId: string, stats: NetworkStats) => void;

  constructor(onStatsUpdate?: (userId: string, stats: NetworkStats) => void) {
    this.onStatsUpdate = onStatsUpdate;
  }

  /**
   * Start monitoring a peer connection
   */
  public startMonitoring(userId: string, peerConnection: RTCPeerConnection) {
    // Clear existing interval if any
    this.stopMonitoring(userId);

    const interval = setInterval(async () => {
      try {
        const stats = await this.getConnectionStats(userId, peerConnection);
        
        if (this.onStatsUpdate) {
          this.onStatsUpdate(userId, stats);
        }

        // Log warnings for poor quality
        if (stats.quality === 'poor' || stats.quality === 'disconnected') {
          console.warn(`⚠️ Poor connection quality with ${userId}:`, stats);
        }
      } catch (error) {
        console.error(`Error monitoring connection with ${userId}:`, error);
      }
    }, 2000); // Check every 2 seconds

    this.intervals.set(userId, interval);
  }

  /**
   * Stop monitoring a peer connection
   */
  public stopMonitoring(userId: string) {
    const interval = this.intervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(userId);
    }
  }

  /**
   * Stop all monitoring
   */
  public stopAll() {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }

  /**
   * Get current connection statistics
   */
  private async getConnectionStats(
    userId: string,
    pc: RTCPeerConnection
  ): Promise<NetworkStats> {
    const stats = await pc.getStats();

    let packetsLost = 0;
    let packetsReceived = 0;
    let jitter = 0;
    let bytesReceived = 0;
    let rtt = 0;

    stats.forEach((report) => {
      // Inbound video stream stats
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        packetsLost = report.packetsLost || 0;
        packetsReceived = report.packetsReceived || 0;
        jitter = report.jitter || 0;
        bytesReceived = report.bytesReceived || 0;
      }

      // Round-trip time from candidate pair
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime ? report.currentRoundTripTime * 1000 : 0;
      }
    });

    const totalPackets = packetsLost + packetsReceived;
    const packetLossRate = totalPackets > 0 ? packetsLost / totalPackets : 0;

    // Calculate bandwidth (rough estimate)
    const bandwidth = bytesReceived * 8 / 1000; // kbps

    // Determine quality based on packet loss and RTT
    const quality = this.calculateQuality(packetLossRate, rtt);

    return {
      userId,
      quality,
      packetsLost,
      packetsReceived,
      packetLossRate,
      jitter,
      bandwidth,
      rtt,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate overall connection quality
   */
  private calculateQuality(
    packetLossRate: number,
    rtt: number
  ): 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected' {
    // Check if disconnected (100% packet loss)
    if (packetLossRate >= 0.5) {
      return 'disconnected';
    }

    // Quality based on packet loss and RTT
    if (packetLossRate < 0.02 && rtt < 150) {
      return 'excellent'; // 📶📶📶
    }

    if (packetLossRate < 0.05 && rtt < 300) {
      return 'good'; // 📶📶
    }

    if (packetLossRate < 0.10 && rtt < 500) {
      return 'fair'; // 📶
    }

    return 'poor'; // ⚠️
  }

  /**
   * Get quality indicator emoji
   */
  public static getQualityIndicator(quality: NetworkStats['quality']): string {
    switch (quality) {
      case 'excellent':
        return '📶📶📶';
      case 'good':
        return '📶📶';
      case 'fair':
        return '📶';
      case 'poor':
        return '⚠️';
      case 'disconnected':
        return '❌';
      default:
        return '❓';
    }
  }

  /**
   * Get quality color
   */
  public static getQualityColor(quality: NetworkStats['quality']): string {
    switch (quality) {
      case 'excellent':
        return '#00ff00';
      case 'good':
        return '#90ee90';
      case 'fair':
        return '#ffa500';
      case 'poor':
        return '#ff6347';
      case 'disconnected':
        return '#ff0000';
      default:
        return '#808080';
    }
  }
}
