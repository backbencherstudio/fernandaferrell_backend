import { Injectable } from '@nestjs/common';
import { LivekitService } from '../livekit/livekit.service';

@Injectable()
export class StreamService {
  constructor(private livekitService: LivekitService) {}

  async startLiveStream(user_id: string) {
    // Unique room name for the stream
    const room_name = `stream_${user_id}`;
    const token = await this.livekitService.getCallToken(room_name, user_id);
    
    return { room_name, token };
  }

  async joinStream(stream_id: string, viewer_id: string) {
    const room_name = `stream_${stream_id}`;
    // Viewer er jonno is_host = false
    const token = await this.livekitService.getCallToken(room_name, viewer_id);
    
    return { token };
  }
}