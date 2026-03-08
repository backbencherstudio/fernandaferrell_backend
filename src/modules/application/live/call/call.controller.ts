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

@Controller('v1/video-calls')
export class CallController {
  constructor(private readonly livekitService: LivekitService) {}

  /**
   * 1. Caller call shuru korbe
   */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a call' })
  @ApiBody({ type: InitiateCallDto })
  @ApiResponse({ status: 200, description: 'Call initiated successfully' })
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  async initiateCall(@Req() req: any, @Body() body: { receiver_id: string }) {
    const caller_id = req.user.userId; // JWT theke caller ID nichchi
    const { receiver_id } = body;

    // Unique room name generation logic
    const room_name = `call_${[caller_id, receiver_id].sort().join('_')}`;

    // Caller-er jonno access token
    const token = await this.livekitService.getCallToken(room_name, caller_id);

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
