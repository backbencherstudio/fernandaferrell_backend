import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { StreamService } from './stream.service';

@ApiTags('Live Stream')
@Controller('v1/streams')
export class StreamController {
  constructor(private readonly streamService: StreamService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('start')
  @ApiOperation({ summary: 'Host starts live and auto-recording' })
  @ApiBody({
    schema: { type: 'object', properties: { title: { type: 'string' } } },
  })
  async start(@Req() req, @Body() body: { title: string }) {
    return this.streamService.startStream(req.user.userId, body.title);
  }

  @Get('active-list')
  @ApiOperation({ summary: 'Get all active live streams' })
  async getActive() {
    return this.streamService.getActiveStreams();
  }

  @Get('join/:room_name')
  @ApiOperation({ summary: 'Public endpoint for guests to join a live' })
  @ApiParam({ name: 'room_name', type: 'string' })
  async join(@Param('room_name') room_name: string) {
    const guestId = `guest_${Math.floor(Math.random() * 10000)}`;
    return this.streamService.getPublicJoinToken(room_name, guestId);
  }

  @Get('videos')
  @ApiOperation({ summary: 'Get all recorded videos (Past streams)' })
  async getVideos() {
    return this.streamService.getAllRecordedVideos();
  }

  @Get('videos/:room_name')
  @ApiOperation({ summary: 'Get details of a single recorded video' })
  @ApiParam({ name: 'room_name', type: 'string' })
  async getVideo(@Param('room_name') room_name: string) {
    return this.streamService.getSingleRecordedVideo(room_name);
  }
}
