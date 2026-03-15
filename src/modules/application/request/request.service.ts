import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { RequestStatus, UserType } from 'prisma/generated';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import appConfig from 'src/config/app.config';
import { MessageGateway } from 'src/modules/chat/message/message.gateway';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFeedbackDto, CreateRequestDto } from './dto/create-request.dto';

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {}

  async createRequest(
    seeker_id: string,
    dto: CreateRequestDto,
    file: Express.Multer.File,
  ) {
    // 1. Validate Seeker
    const user = await this.prisma.user.findUnique({
      where: { id: seeker_id },
      select: { id: true, type: true, name: true }, // Optimization: Only select what you need
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== UserType.SEEKER) {
      throw new BadRequestException('User is not a seeker');
    }

    let attachmentPath = '';
    if (file) {
      try {
        // Generate name: e.g., 1772526..._image.jpg
        attachmentPath = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

        // The path relative to your storage root
        const relativePath = `requests/${attachmentPath}`;

        // Upload the buffer
        await TajulStorage.put(relativePath, file.buffer);
      } catch (uploadError) {
        console.error('Upload Error:', uploadError);
        throw new BadRequestException('Failed to upload image.');
      }
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const request = await tx.request.create({
          data: {
            title: dto.title,
            description: dto.description,
            category: dto.category,
            location: dto.location,
            estimated_duration: dto.estimated_duration,
            urgency_level: dto.urgency_level,
            skills_needed: dto.skills_needed,
            status: RequestStatus.PENDING,
            seeker_id: seeker_id,
            attachments: attachmentPath
              ? {
                  create: {
                    path: attachmentPath,
                    name: file.originalname,
                    type: file.mimetype,
                  },
                }
              : undefined,
          },
          include: { attachments: true },
        });

        // const volunteers = await tx.user.findMany({
        //   where: { type: UserType.VOLUNTEER },
        //   select: { id: true },
        // });

        // if (volunteers.length > 0) {
        //   await tx.notification.createMany({
        //     data: volunteers.map((volunteer) => ({
        //       sender_id: seeker_id,
        //       receiver_id: volunteer.id,
        //       content: `New request: ${request.title} by ${user.name}`,
        //       entity_id: request.id,
        //     })),
        //   });
        // }

        // return { request, volunteerIds: volunteers.map((v) => v.id) };
        return { request };
      });

      // 4. Real-time Emission (Outside transaction to prevent blocking)
      // this.messageGateway.server
      //   .to(result.volunteerIds)
      //   .emit('new_request', result.request);

      return {
        success: true,
        message: 'Request created successfully',
        data: result.request,
        // volunteerIds: result.volunteerIds,
      };
    } catch (error) {
      // console.error('Prisma Validation Error:', error);
      throw new BadRequestException(
        'Failed to create request. Technical details: ' + error.message,
      );
    }
  }

  async getAvailableRequests(query: { page?: number; limit?: number }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // 1. Fetch total count and data in parallel for better performance
    const [total, requests] = await Promise.all([
      this.prisma.request.count({
        where: { status: RequestStatus.PENDING },
      }),
      this.prisma.request.findMany({
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
          attachments: {
            select: { path: true },
          },
          seeker: {
            select: {
              name: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    if (!requests || requests.length === 0) {
      throw new NotFoundException('No available requests found');
    }

    // 2. Map the data
    const mappedData = requests.map((req) => ({
      id: req.id,
      title: req.title,
      description: req.description,
      priority: req.urgency_level,
      category: req.category,
      location: req.location,
      duration: req.estimated_duration,
      skills: req.skills_needed.join(', '),
      attachments: req.attachments.map((attachment) => ({
        path: TajulStorage.url(
          `${appConfig().storageUrl.requests}${attachment.path}`,
        ),
      })),
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

    // 3. Return with Pagination Metadata
    return {
      success: true,
      message: 'Latest available requests fetched successfully',
      data: mappedData,
      meta: {
        total_items: total,
        current_page: page,
        limit: limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getMyRequests(seeker_id: string) {
    // Parallel execution for better performance
    const [requests, counts] = await Promise.all([
      this.prisma.request.findMany({
        where: { seeker_id },
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
          attachments: { select: { path: true } },
          seeker: {
            select: { name: true, avatar: true },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      // Single query to get all status counts
      this.prisma.request.groupBy({
        by: ['status'],
        where: { seeker_id },
        _count: { _all: true },
      }),
    ]);

    if (!requests || requests.length === 0) {
      throw new NotFoundException('No requests found');
    }

    // Count data map kora
    const stats = {
      complete: counts.find((c) => c.status === 'COMPLETED')?._count._all || 0,
      pending: counts.find((c) => c.status === 'PENDING')?._count._all || 0,
    };

    const mappedData = requests.map((req) => ({
      id: req.id,
      title: req.title,
      description: req.description,
      priority: req.urgency_level,
      category: req.category,
      location: req.location,
      duration: req.estimated_duration,
      skills: req.skills_needed.join(', '),
      attachments: req.attachments.map((attachment) => ({
        path: TajulStorage.url(
          `${appConfig().storageUrl.requests}${attachment.path}`,
        ),
      })),
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
      message: 'My requests fetched successfully',
      stats, // complete: 0, pending: 45 format e ashbe
      data: mappedData,
    };
  }

  async getAllDisasters(query: {
    category?: string;
    page?: number;
    limit?: number;
  }) {
    const { category, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // 1. Filtering Logic
    const where: any = {
      status: RequestStatus.PENDING,
    };

    if (category && !['disaster', 'all'].includes(category.toLowerCase())) {
      where.category = category;
    }

    const [requests, totalCount] = await Promise.all([
      this.prisma.request.findMany({
        where,
        skip,
        take: Number(limit),
        include: {
          seeker: true,
          attachments: {
            take: 1,
          },
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      this.prisma.request.count({ where }),
    ]);

    if (!requests.length && page === 1) {
      throw new NotFoundException('No disasters found');
    }

    const mappedData = requests.map((req) => ({
      id: req.id,
      disaster_image:
        req.attachments.length > 0
          ? TajulStorage.url(
              `${appConfig().storageUrl.requests}${req.attachments[0].path}`,
            )
          : null,
      title: req.title,
      time_ago: formatDistanceToNow(new Date(req.created_at), {
        addSuffix: true,
      }),
      user: {
        name: req.seeker.name,
        username: `@${req.seeker.username || req.seeker.name.toLowerCase().replace(/\s+/g, '')}`,
        avatar: req.seeker.avatar
          ? TajulStorage.url(
              `${appConfig().storageUrl.avatar}/${req.seeker.avatar}`,
            )
          : null,
      },
    }));

    return {
      success: true,
      message: 'Disasters fetched successfully',
      meta: {
        total: totalCount,
        page: Number(page),
        last_page: Math.ceil(totalCount / limit),
      },
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
        attachments: {
          select: {
            path: true,
          },
        },
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
      attachments: req.attachments.map((attachment) => ({
        path: TajulStorage.url(
          `${appConfig().storageUrl.requests}${attachment.path}`,
        ),
      })),
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
      // 1. Status update to COMPLETED
      await tx.request.update({
        where: { id: request_id },
        data: { status: RequestStatus.COMPLETED },
      });

      // 2. Logic: Volunteer jodi feedback dey, tahole tar point +1 hobe
      if (request.volunteer_id === user_id) {
        await tx.user.update({
          where: { id: user_id },
          data: {
            points: {
              increment: 1,
            },
          },
        });
      }

      // 3. Create feedback
      return tx.feedback.create({
        data: {
          rating_type: dto.rating_type,
          comment: dto.comment,
          request_id: request_id,
          user_id: user_id,
        },
      });
    });
  }
}
