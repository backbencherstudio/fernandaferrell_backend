import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file')) // Key matches Swagger
  async create(
    @Body() dto: CreateRequestDto,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const seeker_id = req.user.userId;
    const result = await this.requestService.createRequest(
      seeker_id,
      dto,
      file,
    );

    // Emit to Gateway
    // this.messageGateway.server.to(result.volunteerIds).emit('new_request', result.request);

    return { success: true, data: result.data };
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

  @Get('all-disasters')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all available disasters with filtering and pagination',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    example: 'HURRICANE_PREPARATION',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getAll(
    @Query('category') category?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
  ) {
    return this.requestService.getAllDisasters({
      category,
      page,
      limit,
    });
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
