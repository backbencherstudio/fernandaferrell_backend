import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StartStreamDto } from 'src/modules/application/live/dto/response-dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { LivekitService } from '../livekit/livekit.service';

@ApiTags('Live Stream')
@Controller('v1/streams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class StreamController {
  constructor(private readonly livekitService: LivekitService) {}

  // 1. Host jokhon live shuru korbe
  @ApiOperation({ summary: 'Start a new live stream as a host' })
  @ApiBody({ type: StartStreamDto })
  @Post('start')
  async startStream(@Req() req: any, @Body() body: StartStreamDto) {
    const user_id = req.user.userId;
    const room_name = `live_${user_id}_${Date.now()}`;

    const token = await this.livekitService.generateStreamToken(
      room_name,
      user_id,
      true,
    );

    return {
      status: 'success',
      data: {
        room_name,
        token,
        title: body.title,
        livekit_url: process.env.LIVEKIT_URL,
      },
    };
  }

  // 2. Viewer jokhon kono live-e join korbe
  @ApiOperation({ summary: 'Join an existing stream as a viewer' })
  @Get('join/:room_name')
  async joinStream(@Req() req: any, @Param('room_name') room_name: string) {
    const viewer_id = req.user.userId;

    // Viewer er jonno token (is_host = false)
    const token = await this.livekitService.generateStreamToken(
      room_name,
      viewer_id,
      false,
    );

    return {
      status: 'success',
      data: {
        token,
        livekit_url: process.env.LIVEKIT_URL,
      },
    };
  }
}
