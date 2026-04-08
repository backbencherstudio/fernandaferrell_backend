import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { LivekitService } from '../livekit/livekit.service';

@Injectable()
export class StreamService {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly prisma: PrismaService,
  ) {}

async startStream(userId: string, title: string) {
  // 1. Validate User Role (If not handled by Guard)
  const user = await this.prisma.users.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (user?.role !== 'SEEKER') {
    throw new ForbiddenException('Only seekers can start a live stream.');
  }

  // 2. Handle Concurrency: Find and stop existing active streams for this user
  const activeStream = await this.prisma.live_streams.findFirst({
    where: { 
      host_id: userId, 
      is_active: true 
    },
  });

  if (activeStream) {
    // Update DB to stop previous stream
    await this.prisma.live_streams.update({
      where: { id: activeStream.id },
      data: { is_active: false, ended_at: new Date() },
    });

    // Optional: Call LiveKit to explicitly kick everyone/close previous room
    // await this.livekitService.stopRoom(activeStream.room_name);
  }

  // 3. Prepare New Stream
  const room_name = `live_${userId}_${Date.now()}`;

  // Generate Token for Host
  const token = await this.livekitService.generateStreamToken(
    room_name,
    userId,
    true,
  );

  // Create new stream record
  const stream = await this.prisma.live_streams.create({
    data: {
      room_name,
      host_id: userId,
      title,
      is_active: true,
    },
  });

  // 4. Trigger Auto Recording
  await this.livekitService.triggerAutoRecording(room_name);

  return { 
    token, 
    room_name,
    stream_id: stream.id 
  };
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

    if (!stream)
      throw new NotFoundException('Live stream not found or inactive');

    // Guest will have is_host = false
    const token = await this.livekitService.generateStreamToken(
      room_name,
      viewer_id,
      false,
    );
    return { token };
  }

  async stopStream(userId: string, room_name: string) {
    // 1. Verify Ownership & Existence
    const stream = await this.prisma.live_streams.findUnique({
      where: { room_name },
    });

    if (!stream) {
      throw new NotFoundException('Stream not found');
    }

    if (stream.host_id !== userId) {
      throw new ForbiddenException('You are not the host of this stream');
    }

    try {
      // 2. Close the room in LiveKit (this kicks everyone out)
      await this.livekitService.deleteRoom(room_name);

      // 3. Update Database status
      const updatedStream = await this.prisma.live_streams.update({
        where: { room_name },
        data: {
          is_active: false,
          // recording_url webhook theke update kora better,
          // kintu ekhane basic updated status handle kora hocche
        },
      });

      return {
        message: 'Stream stopped successfully',
        room_name: updatedStream.room_name,
      };
    } catch (error) {
      // Room jodi agei bondho hoye jay LiveKit side e, tokhon db update kore dite hobe
      await this.prisma.live_streams.update({
        where: { room_name },
        data: { is_active: false },
      });

      return { message: 'Stream was already closed or ended' };
    }
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
