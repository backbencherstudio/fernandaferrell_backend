import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LivekitService } from '../livekit/livekit.service';

@Injectable()
export class StreamService {
  constructor(
    private livekitService: LivekitService,
    private readonly prisma: PrismaService,
  ) {}

  async startStream(user_id: string, title: string) {
    const room_name = `live_${user_id}_${Date.now()}`;
    const token = await this.livekitService.generateStreamToken(
      room_name,
      user_id,
      true,
    );

    // Prisma table e live record entry [cite: 2026-01-31]
    await this.prisma.live_streams.create({
      data: {
        room_name,
        host_id: user_id,
        title,
        is_active: true,
      },
    });

    return { token, room_name };
  }

  async getActiveStreams() {
    const streams = await this.prisma.live_streams.findMany({
      where: {
        is_active: true,
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return streams.map((stream) => ({
      ...stream,
      host: stream.host,
    }));
  }

  async getPublicJoinToken(room_name: string, viewer_id: string = 'guest') {
    // Viewer er jonno is_host = false
    return this.livekitService.generateStreamToken(room_name, viewer_id, false);
  }
}
