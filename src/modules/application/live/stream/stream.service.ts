import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LivekitService } from '../livekit/livekit.service';

@Injectable()
export class StreamService {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly prisma: PrismaService,
  ) {}

  async startStream(userId: string, title: string) {
    const room_name = `live_${userId}_${Date.now()}`;
    
    // 1. Generate Token for Host
    const token = await this.livekitService.generateStreamToken(room_name, userId, true);

    // 2. Create Record in DB
    await this.prisma.live_streams.create({
      data: {
        room_name,
        host_id: userId,
        title,
        is_active: true,
      },
    });

    // 3. Trigger Auto Recording (Background process)
    // Local public folder-e save hobe
    await this.livekitService.triggerAutoRecording(room_name);

    return { token, room_name };
  }

  async getActiveStreams() {
    return this.prisma.live_streams.findMany({
      where: { is_active: true },
      include: { host: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getPublicJoinToken(room_name: string, viewer_id: string) {
    const stream = await this.prisma.live_streams.findUnique({
      where: { room_name, is_active: true },
    });

    if (!stream) throw new NotFoundException('Live stream not found or inactive');

    // Guest will have is_host = false
    const token = await this.livekitService.generateStreamToken(room_name, viewer_id, false);
    return { token };
  }

  async getAllRecordedVideos() {
    return this.prisma.live_streams.findMany({
      where: { is_active: false, NOT: { recording_url: null } },
      include: { host: { select: { id: true, name: true } } },
      orderBy: { created_at: 'desc' },
    });
  }

  async getSingleRecordedVideo(room_name: string) {
    const video = await this.prisma.live_streams.findUnique({
      where: { room_name },
      include: { host: { select: { id: true, name: true } } },
    });
    if (!video) throw new NotFoundException('Recorded video not found');
    return video;
  }
}