import { Injectable, Logger } from '@nestjs/common';
import { 
  AccessToken, 
  EgressClient, 
  EncodedFileOutput, 
  EncodedFileType,
  RoomServiceClient 
} from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly logger = new Logger(LivekitService.name);
  private readonly apiKey = process.env.LIVEKIT_API_KEY;
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET;
  private readonly rawUrl = process.env.LIVEKIT_URL;

  public readonly roomService: RoomServiceClient;
  public readonly egressClient: EgressClient;

  constructor() {
    /**
     * LiveKit RPC clients (RoomService & Egress) require http/https protocols.
     * We convert wss:// to https:// or ws:// to http:// automatically.
     */
    const httpUrl = this.rawUrl.replace('wss://', 'https://').replace('ws://', 'http://');

    this.roomService = new RoomServiceClient(
      httpUrl,
      this.apiKey,
      this.apiSecret,
    );

    this.egressClient = new EgressClient(
      httpUrl,
      this.apiKey,
      this.apiSecret,
    );
  }

  /**
   * Generates a token for the Live Stream (Host vs Guest permissions)
   */
  async generateStreamToken(room_name: string, user_id: string, is_host: boolean): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user_id,
    });

    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: is_host,      // Only host can stream video/audio
      canPublishData: true,    // Everyone can send data (chat/reactions)
      canSubscribe: true,      // Everyone can watch
    });

    return at.toJwt();
  }

  /**
   * Generates a token for standard multi-party calls
   */
  async getCallToken(room_name: string, user_id: string): Promise<string> {
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
   * Triggers Room Composite Egress to record the session.
   * Ensure the 'public/live_streams/' directory exists and is writable.
   */
  async triggerAutoRecording(room_name: string): Promise<string | null> {
    try {
      // Local path formatting
      const filepath = `public/live_streams/${room_name}.mp4`;

      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: filepath, 
      });

      const info = await this.egressClient.startRoomCompositeEgress(
        room_name,
        fileOutput,
        { 
          layout: 'speaker', // Focus on the active speaker
          audioOnly: false 
        }
      );

      this.logger.log(`Recording started for room: ${room_name}. EgressID: ${info.egressId}`);
      return info.egressId;
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error.message}`);
      return null;
    }
  }

  /**
   * Manually stop a recording session via EgressID
   */
  async stopRecording(egressId: string): Promise<void> {
    try {
      await this.egressClient.stopEgress(egressId);
      this.logger.log(`Recording stopped for EgressID: ${egressId}`);
    } catch (error) {
      this.logger.error(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * Delete/Close a room and kick all participants
   */
  async deleteRoom(room_name: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(room_name);
      this.logger.log(`Room ${room_name} has been closed.`);
    } catch (error) {
      this.logger.error(`Error deleting room: ${error.message}`);
      throw error;
    }
  }
}