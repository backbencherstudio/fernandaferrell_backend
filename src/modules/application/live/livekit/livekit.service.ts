import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  AccessToken,
  EgressClient,
  EncodedFileOutput,
  EncodedFileType,
  RoomServiceClient,
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
     * LiveKit RPC clients require http/https protocols.
     * wss:// or ws:// converts to https:// or http:// automatically.
     */
    const httpUrl = this.rawUrl
      .replace('wss://', 'https://')
      .replace('ws://', 'http://');

    this.roomService = new RoomServiceClient(
      httpUrl,
      this.apiKey,
      this.apiSecret,
    );

    this.egressClient = new EgressClient(httpUrl, this.apiKey, this.apiSecret);
  }

  /**
   * Generates a token for standard multi-party video calls
   */
  /**
   * Generates a token for standard calls (Audio or Video)
   */
  async getCallToken(
    room_name: string,
    user_id: string,
    call_type: 'AUDIO' | 'VIDEO' = 'VIDEO', // Default 'VIDEO' thakbe jodi controller theke na pathan
  ): Promise<string> {
    try {
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: user_id,
        ttl: '2h',
        metadata: JSON.stringify({ call_type }),
      });

      at.addGrant({
        roomJoin: true,
        room: room_name,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
      });

      return at.toJwt();
    } catch (error) {
      this.logger.error(`Token generation failed: ${error.message}`);
      throw new InternalServerErrorException('Could not generate call token');
    }
  }

  /**
   * Generates a token for Live Stream (Host vs Guest)
   */
  async generateStreamToken(
    room_name: string,
    user_id: string,
    is_host: boolean,
  ): Promise<string> {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user_id,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: is_host,
      canPublishData: true,
      canSubscribe: true,
    });

    return at.toJwt();
  }

  /**
   * Delete/Close a room and kick all participants
   */
  async deleteRoom(room_name: string): Promise<void> {
    try {
      await this.roomService.deleteRoom(room_name);
      this.logger.log(`Room ${room_name} has been closed.`);
    } catch (error) {
      // Room jodi agei empty hoye delete hoye jay seta error handle korar dorkar nai
      this.logger.warn(`Error deleting room: ${error.message}`);
    }
  }

  /**
   * Recording: Triggers Room Composite Egress
   */
  async triggerAutoRecording(room_name: string): Promise<string | null> {
    try {
      const filepath = `public/live_streams/${room_name}_${Date.now()}.mp4`;

      const fileOutput = new EncodedFileOutput({
        fileType: EncodedFileType.MP4,
        filepath: filepath,
      });

      const info = await this.egressClient.startRoomCompositeEgress(
        room_name,
        fileOutput,
        {
          layout: 'speaker',
          audioOnly: false,
        },
      );

      this.logger.log(
        `Recording started for room: ${room_name}. EgressID: ${info.egressId}`,
      );
      return info.egressId;
    } catch (error) {
      this.logger.error(`Failed to start recording: ${error.message}`);
      return null;
    }
  }

  /**
   * Stop recording via EgressID
   */
  async stopRecording(egressId: string): Promise<void> {
    try {
      await this.egressClient.stopEgress(egressId);
      this.logger.log(`Recording stopped for EgressID: ${egressId}`);
    } catch (error) {
      this.logger.error(`Failed to stop recording: ${error.message}`);
    }
  }
}
