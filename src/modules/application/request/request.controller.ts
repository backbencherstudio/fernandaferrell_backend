import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRequestResponseDto } from 'src/modules/application/request/dto/create-request-response.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateFeedbackDto, CreateRequestDto } from './dto/create-request.dto';
import { RequestService } from './request.service';

@ApiTags('Help Requests')
@ApiBearerAuth()
@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post('create-request')
  @ApiOperation({ summary: 'Create a new help request (Seeker)' })
  // @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateRequestDto, description: 'Create a new help request' })
  @ApiResponse({
    status: 201,
    description: 'Request created successfully.',
    type: CreateRequestDto,
  })
  async create(@Body() dto: CreateRequestDto, @Req() req: any) {
    const seeker_id = req.user.userId;
    return this.requestService.createRequest(seeker_id, dto);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get all available help requests sorted by latest' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns list of requests as seen in the UI',
    type: [CreateRequestResponseDto],
  })
  async getAvailableRequests() {
    return await this.requestService.getAvailableRequests();
  }

  @Get(':id/details')
  @ApiOperation({ summary: 'Fetch single request for View Details screen' })
  @ApiResponse({
    status: 200,
    description: 'Request details',
    type: CreateRequestResponseDto,
  })
  async getSingleRequest(@Param('id') id: string) {
    return await this.requestService.getSingleRequest(id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accept a pending request (Volunteer)' })
  @ApiResponse({ status: 200, description: 'Request accepted successfully.' })
  @ApiResponse({
    status: 409,
    description: 'Conflict: Already accepted or self-acceptance.',
  })
  async accept(@Param('id') id: string, @Req() req: any) {
    const volunteer_id = req.user.userId;
    return this.requestService.acceptRequest(volunteer_id, id);
  }

  @Post(':id/feedback')
  @ApiOperation({
    summary: 'Submit feedback for a request (Seeker/Volunteer)',
    description:
      'Both seeker and volunteer can submit feedback once. Completes the request status.',
  })
  @ApiBody({ type: CreateFeedbackDto, description: 'Feedback for a request' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Already submitted or Unauthorized.',
  })
  @ApiResponse({ status: 404, description: 'Request not found.' })
  async feedback(
    @Param('id') id: string,
    @Body() dto: CreateFeedbackDto,
    @Req() req: any,
  ) {
    const user_id = req.user.id; // JWT Guard theke user ID nite hobe
    return this.requestService.submitFeedback(user_id, id, dto);
  }
}
