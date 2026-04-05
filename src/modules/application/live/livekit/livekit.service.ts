import { Injectable, Logger } from '@nestjs/common';
import { 
  AccessToken, 
  EgressClient, 
  EncodedFileOutput, 
  EncodedFileType 
} from 'livekit-server-sdk';
import { join } from 'path';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);
  private readonly apiKey = process.env.LIVEKIT_API_KEY;
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET;
  private readonly rawUrl = process.env.LIVEKIT_URL;
  private egressClient: EgressClient;

  constructor() {
    // URL format fix: Twirp RPC requires https/http, not wss/ws
    const httpUrl = this.rawUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    this.egressClient = new EgressClient(
      httpUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  async generateStreamToken(room_name: string, user_id: string, is_host: boolean) {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user_id,
    });

    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: is_host,      // Only host can publish video/audio
      canPublishData: true,    // Both host and guest can chat/react
      canSubscribe: true,      // Everyone can watch
    });

    return at.toJwt();
  }

   async getCallToken(room_name: string, user_id: string) {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user_id,
    });

    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: true,
      canSubscribe: true,
    });

    return at.toJwt();
  }

  /**
   * Triggers recording to a local folder
   * Note: This only works if LiveKit is self-hosted on the same server.
   * If using LiveKit Cloud, you MUST use S3/R2 instead of local path.
   */
  async triggerAutoRecording(room_name: string) {
    try {
      // Local path in public folder
      const filepath = `public/live_streams/${room_name}.mp4`;

      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: filepath, 
      });

      const info = await this.egressClient.startRoomCompositeEgress(
        room_name,
        fileOutput,
        { layout: 'speaker' }
      );

      this.logger.log(`Recording started for room: ${room_name}. EgressID: ${info.egressId}`);
      return info.egressId;
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error.message}`);
      return null;
    }
  }
}