import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { RequestStatus, UserType } from 'prisma/generated';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import appConfig from 'src/config/app.config';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFeedbackDto, CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. Create a new request (Seeker)
  async createRequest(seeker_id: string, dto: CreateRequestDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: seeker_id },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== UserType.SEEKER) {
      throw new BadRequestException('User is not a seeker');
    }
    const request = await this.prisma.request.create({
      data: {
        ...dto,
        status: RequestStatus.PENDING,
        seeker: {
          connect: { id: seeker_id },
        },
      },
    });

    console.log('request', request);

    return {
      success: true,
      message: 'Request created successfully',
      data: request,
    };
  }

  // 4. Get all pending requests for Volunteers
  async getAvailableRequests() {
    const requests = await this.prisma.request.findMany({
      where: {
        status: RequestStatus.PENDING,
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        estimated_duration: true,
        urgency_level: true,
        skills_needed: true,
        created_at: true,
        seeker: {
          select: {
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!requests || requests.length === 0) {
      throw new NotFoundException('No available requests found');
    }

    // Mapping to match your CreateRequestResponseDto structure
    const mappedData = requests.map((req) => ({
      id: req.id,
      title: req.title,
      description: req.description,
      priority: req.urgency_level,
      category: req.category,
      location: req.location,
      duration: req.estimated_duration,
      skills: req.skills_needed.join(', '),
      time_ago: formatDistanceToNow(req.created_at, { addSuffix: true }),
      user: {
        name: req.seeker.name,
        username: `@${req.seeker.name.toLowerCase().replace(/\s+/g, '')}`,
        avatar: req.seeker.avatar
          ? TajulStorage.url(
              `${appConfig().storageUrl.avatar}/${req.seeker.avatar}`,
            )
          : null,
      },
    }));

    return {
      success: true,
      message: 'Latest available requests fetched successfully',
      data: mappedData,
    };
  }

  async getSingleRequest(id: string) {
    const req = await this.prisma.request.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        location: true,
        // Map functionality-r jonno database-e ei field gulo thaka dorkar
        // latitude: true,
        // longitude: true,
        estimated_duration: true,
        urgency_level: true,
        skills_needed: true,
        created_at: true,
        seeker: {
          select: {
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!req) {
      throw new NotFoundException(`Request not found`);
    }

    // Mapping exactly as per Image 2 (View Details)
    const data = {
      id: req.id,
      title: req.title,
      description: req.description,
      priority: req.urgency_level, // "High"
      category: req.category, // "Hurricane preparation"
      location: req.location, // "Miami Beach, FL"
      // coordinates: {            // Optional: Map marker placement
      //   lat: req.latitude,
      //   lng: req.longitude
      // },
      duration: req.estimated_duration, // "2-3 hours"
      skills: req.skills_needed.join(', '), // "Manual labor, Tools"
      time_ago: formatDistanceToNow(req.created_at, { addSuffix: true }),
      user: {
        name: req.seeker.name,
        username: `@${req.seeker.name.toLowerCase().replace(/\s+/g, '')}`,
        avatar: req.seeker.avatar
          ? TajulStorage.url(
              `${appConfig().storageUrl.avatar}/${req.seeker.avatar}`,
            )
          : null,
      },
    };

    return {
      success: true,
      message: 'Request details fetched successfully',
      data,
    };
  }

  // 2. Accept a request (Volunteer)
  async acceptRequest(user_id: string, request_id: string) {
    // 1. User check kora (Role check)
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { type: true },
    });

    if (!user) throw new NotFoundException('User not found');

    // 2. Only VOLUNTEER role can accept
    if (user.type !== UserType.VOLUNTEER) {
      throw new BadRequestException('Only volunteers can accept help requests');
    }

    // 3. Request validity check
    const request = await this.prisma.request.findUnique({
      where: { id: request_id },
    });

    if (!request) throw new NotFoundException('Request not found');

    // 4. Status check (Only PENDING can be accepted)
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Request is already accepted or completed');
    }

    // 5. Prevent Seeker from accepting their own request (Logic check)
    if (request.seeker_id === user_id) {
      throw new BadRequestException('You cannot accept your own request');
    }

    return this.prisma.request.update({
      where: { id: request_id },
      data: {
        volunteer_id: user_id,
        status: RequestStatus.ACCEPTED,
      },
    });
  }

  // 3. Complete & Give Feedback
  async submitFeedback(
    user_id: string,
    request_id: string,
    dto: CreateFeedbackDto,
  ) {
    const request = await this.prisma.request.findUnique({
      where: { id: request_id },
    });

    if (!request) throw new NotFoundException('Request not found');

    const existingFeedback = await this.prisma.feedback.findFirst({
      where: {
        request_id: request_id,
        user_id: user_id,
      },
    });

    if (existingFeedback) {
      throw new BadRequestException(
        'You have already submitted feedback for this request',
      );
    }

    if (request.seeker_id !== user_id && request.volunteer_id !== user_id) {
      throw new BadRequestException(
        'You are not authorized to give feedback for this request',
      );
    }
    return this.prisma.$transaction(async (tx) => {
      // Status update to COMPLETED
      await tx.request.update({
        where: { id: request_id },
        data: { status: RequestStatus.COMPLETED },
      });

      // Create feedback
      return tx.feedback.create({
        data: {
          rating_type: dto.rating_type,
          comment: dto.comment,
          request_id,
          user_id: user_id,
        },
      });
    });
  }
}
