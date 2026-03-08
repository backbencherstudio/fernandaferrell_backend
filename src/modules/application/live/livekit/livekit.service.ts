import { Injectable } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LivekitService {
  private readonly apiKey = process.env.LIVEKIT_API_KEY;
  private readonly apiSecret = process.env.LIVEKIT_API_SECRET;

  async getCallToken(room_name: string, user_id: string) {
    // Participant identity hisebe user_id use kora hoy
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user_id,
    });

    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: true,   // Call-e nijer video/audio pathate parbe
      canSubscribe: true,  // Onnojon-ke dekhte/shunte parbe
    });

    return at.toJwt();
  }


  async generateStreamToken(room_name: string, user_id: string, is_host: boolean) {
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: user_id,
    });

    at.addGrant({
      roomJoin: true,
      room: room_name,
      canPublish: is_host,      // Shudhu host stream pathate parbe
      canPublishData: true,    // Shobai (Host + Viewer) like/comment pathate parbe
      canSubscribe: true,      // Shobai stream dekhte parbe
    });

    return at.toJwt();
  }
}