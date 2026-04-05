import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import {
  InitiateCallDto,
  JoinCallDto,
} from 'src/modules/application/live/dto/response-dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { LivekitService } from '../livekit/livekit.service';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';

@Controller('v1/video-calls')
export class CallController {
  constructor(
    private readonly livekitService: LivekitService,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  /**
   * 1. Caller initiates the call and notifies the receiver
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a call' })
  @ApiBody({ type: InitiateCallDto })
  @ApiResponse({ status: 200, description: 'Call initiated successfully' })
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  async initiateCall(@Req() req: any, @Body() body: InitiateCallDto) {
    const caller_id = req.user.userId;
    const { receiver_id } = body;

    // 1. Generate unique room name
    const room_name = `call_${[caller_id, receiver_id].sort().join('_')}`;

    // 2. Generate token for the Caller
    const token = await this.livekitService.getCallToken(room_name, caller_id);

    

    // 3. Create Notification for the Receiver
    // This allows the receiver's UI to show the "Incoming Call" prompt
    await this.notificationRepo.createNotification({
      sender_id: caller_id,
      receiver_id: receiver_id,
      text: `Incoming call from ${req.user.name || 'User'}`,
      type: 'incoming_call',
      entity_id: room_name, // Pass the room_name so the receiver knows which room to join
    });

    return {
      status: 'success',
      data: {
        room_name,
        token,
        livekit_url: process.env.LIVEKIT_URL,
      },
    };
  }

  /**
   * 2. Receiver call accept korle ekhane join korbe
   */

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Join a call' })
  @ApiBody({ type: JoinCallDto })
  @ApiResponse({ status: 200, description: 'Call joined successfully' })
  @UseGuards(JwtAuthGuard)
  @Post('join')
  async joinCall(@Req() req: any, @Body() body: { room_name: string }) {
    const user_id = req.user.userId;

    const token = await this.livekitService.getCallToken(
      body.room_name,
      user_id,
    );

    return {
      status: 'success',
      data: { token },
    };
  }
}
