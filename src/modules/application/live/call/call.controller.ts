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
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
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
  @ApiBody({
    type: InitiateCallDto,
  })
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  async initiateCall(
    @Req() req: any,
    @Body() body: { receiver_id: string; call_type: 'AUDIO' | 'VIDEO' },
  ) {
    const caller_id = req.user.userId;
    const { receiver_id, call_type } = body;

    const room_name = `call_${Date.now()}_${caller_id.slice(-4)}`;
    const token = await this.livekitService.getCallToken(
      room_name,
      caller_id,
      call_type,
    );

    // Prisma DB create
    await this.prisma.calls.create({
      data: {
        room_name,
        caller_id,
        receiver_id,
        call_type: call_type as any,
        status: 'PENDING',
      },
    });

    // Notify Receiver
    await this.notificationRepo.createNotification({
      sender_id: caller_id,
      receiver_id: receiver_id,
      text: `Incoming ${call_type.toLowerCase()} call`,
      type: `incoming_${call_type.toLowerCase()}_call`,
      entity_id: room_name,
    });

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

    // 1. Call exist kore kina check kora
    const call = await this.prisma.calls.findUnique({
      where: { room_name },
    });

    if (!call) {
      throw new NotFoundException('Call not found');
    }

    // 2. LiveKit token generate kora
    const token = await this.livekitService.getCallToken(
      room_name,
      user_id,
      call.call_type as any,
    );

    // 3. Call status update (Scalability-r jonno logic check kora valo jodi call agei start hoye thake)
    const updatedCall = await this.prisma.calls.update({
      where: { room_name },
      data: {
        status: 'ACCEPTED',
        started_at: call.started_at || new Date(), // Jodi agei start hoy, tobe ager time rakha
      },
    });

    // 4. Clean Response
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
  @ApiBody({
    type: TerminateCallDto,
  })
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
