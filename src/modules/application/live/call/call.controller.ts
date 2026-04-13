import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
import appConfig from 'src/config/app.config';
import {
  InitiateCallDto,
  JoinCallDto,
  TerminateCallDto,
} from 'src/modules/application/live/dto/response-dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';
import { LivekitService } from '../livekit/livekit.service';

@ApiTags('Calls')
@Controller('v1/calls')
export class CallController {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly notificationRepo: NotificationRepository,
    private readonly prisma: PrismaService,
  ) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a call' })
  @ApiBody({ type: InitiateCallDto })
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  async initiateCall(
    @Req() req: any,
    @Body() body: { receiver_id: string; call_type: 'AUDIO' | 'VIDEO' },
  ) {
    const caller_id = req.user?.userId;

    //  Fetch from DB
    const user = await this.prisma.user.findUnique({
      where: { id: caller_id },
      select: {
        name: true,
        username: true,
        avatar: true,
      },
    });

    const caller_name = user?.name || user?.username || 'Unknown Caller';
    const caller_avatar = user?.avatar || null;

    const { receiver_id, call_type } = body;

    const room_name = `call_${Date.now()}_${caller_id.slice(-4)}`;
    const token = await this.livekitService.getCallToken(
      room_name,
      caller_id,
      call_type,
    );

    // 1. Create Call Record in DB
    await this.prisma.calls.create({
      data: {
        room_name,
        caller_id,
        receiver_id,
        call_type: call_type as any,
        status: 'PENDING',
      },
    });

    // 2. Notify Receiver with Push Data Payload
    await this.notificationRepo.createNotification({
      sender_id: caller_id,
      receiver_id: receiver_id,
      text: `Incoming ${call_type.toLowerCase()} call`,
      type: `incoming_call`, // Type matched for frontend consistency
      entity_id: room_name,
      payload: {
        room_name: room_name,
        livekit_url: process.env.LIVEKIT_URL,
        receiver_id: receiver_id,
        call_type: call_type,
        caller_id: caller_id,
        caller_name: caller_name,
        caller_avatar: caller_avatar
          ? TajulStorage.url(
              appConfig().storageUrl.avatar + '/' + caller_avatar,
            )
          : null,
        type: 'incoming_call',
      },
    });

    console.log('Receiver ID:', receiver_id, caller_name, caller_avatar);

    // 3. Return Call Info to Caller
    return {
      status: 'success',
      data: {
        room_name,
        token,
        call_type,
        livekit_url: process.env.LIVEKIT_URL,
      },
    };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a call' })
  @ApiBody({ type: JoinCallDto })
  @UseGuards(JwtAuthGuard)
  @Post('join')
  async joinCall(@Req() req: any, @Body() body: JoinCallDto) {
    const user_id = req.user.userId;
    const { room_name } = body;

    const call = await this.prisma.calls.findUnique({
      where: { room_name },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    const token = await this.livekitService.getCallToken(
      room_name,
      user_id,
      call.call_type as any,
    );

    const updatedCall = await this.prisma.calls.update({
      where: { room_name },
      data: {
        status: 'ACCEPTED',
        started_at: call.started_at || new Date(),
      },
    });

    return {
      status: 'success',
      data: {
        room_name: updatedCall.room_name,
        token: token,
        call_type: updatedCall.call_type,
        livekit_url: process.env.LIVEKIT_URL,
      },
    };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminate/Reject call' })
  @ApiBody({ type: TerminateCallDto })
  @UseGuards(JwtAuthGuard)
  @Patch('terminate')
  async terminateCall(
    @Body()
    body: {
      room_name: string;
      status: 'REJECTED' | 'ENDED' | 'MISSED';
    },
  ) {
    const call = await this.prisma.calls.findUnique({
      where: { room_name: body.room_name },
    });

    if (!call) throw new NotFoundException('Call not found');

    let duration = 0;
    if (body.status === 'ENDED' && call.started_at) {
      duration = Math.floor(
        (Date.now() - new Date(call.started_at).getTime()) / 1000,
      );
    }

    await this.prisma.calls.update({
      where: { room_name: body.room_name },
      data: {
        status: body.status as any,
        ended_at: new Date(),
        duration: duration > 0 ? duration : null,
      },
    });

    await this.livekitService.deleteRoom(body.room_name);

    return { status: 'success', message: `Call ${body.status.toLowerCase()}` };
  }
}
