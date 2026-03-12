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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StreamService } from 'src/modules/application/live/stream/stream.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Live Stream')
@Controller('v1/streams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class StreamController {
  constructor(
    private readonly streamService: StreamService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('start')
  @ApiOperation({ summary: 'Start a new stream' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
    },
  })
  async start(@Req() req, @Body() body: { title: string }) {
    // req.user.id is usually attached by the JwtStrategy
    return this.streamService.startStream(req.user.id, body.title);
  }

  // PUBLIC: Jekono user active live list dekhte parbe
  @Get('active-list')
  @ApiOperation({ summary: 'Get all currently active live streams' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of active streams.',
  })
  async getActive() {
    return this.streamService.getActiveStreams();
  }

  @Get('join/:room_name')
  @ApiOperation({ summary: 'Join a stream as a guest (Public)' })
  @ApiParam({
    name: 'room_name',
    type: 'string',
    description: 'The unique name of the room to join',
  })
  @ApiResponse({ status: 200, description: 'Returns a guest access token.' })
  async join(@Param('room_name') room_name: string) {
    // Logic for generating a unique guest ID
    const guestId = `guest_${Math.floor(Math.random() * 10000)}`;

    const token = await this.streamService.getPublicJoinToken(
      room_name,
      guestId,
    );

    return { token, guestId }; // Returning guestId is helpful for frontend tracking
  }
}
