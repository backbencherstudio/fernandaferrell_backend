import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { Prisma, RequestStatus, UserType } from 'prisma/generated';
import { TajulStorage } from 'src/common/lib/Disk/TajulStorage';
import { NotificationRepository } from 'src/common/repository/notification/notification.repository';
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
    file?: Express.Multer.File,
  ) {
    // 1. Validate Seeker
    const user = await this.prisma.user.findUnique({
      where: { id: seeker_id },
      select: { id: true, type: true, name: true },
    });

    if (!user) throw new NotFoundException('User not found');
    if (user.type !== UserType.SEEKER) {
      throw new BadRequestException('User is not a seeker');
    }

    // 2. File Upload logic
    let attachmentPath = '';
    if (file) {
      try {
        attachmentPath = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
        const relativePath = `requests/${attachmentPath}`;
        await TajulStorage.put(relativePath, file.buffer);
      } catch (uploadError) {
        throw new BadRequestException('Failed to upload image.');
      }
    }

    try {
      // 3. Create Request
      const request = await this.prisma.request.create({
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

      // 4. Get ALL Volunteers
      const volunteers = await this.prisma.user.findMany({
        where: {
          type: UserType.VOLUNTEER,
        },
        select: { id: true },
      });

      // 5. Send Notification using Repository
      if (volunteers.length > 0) {
        const notificationPromises = volunteers.map((volunteer) => {
          const notificationPayload: any = {
            sender_id: user.id,
            receiver_id: volunteer.id,
            text: `New request: ${request.title} by ${user.name}`,
            type: 'new_request',
            entity_id: request.id,
          };

          return NotificationRepository.createNotification(notificationPayload);
        });

        // Parallel execution for better speed
        await Promise.all(notificationPromises);
      }

      return {
        success: true,
        message: 'Request created and volunteers notified',
        data: request,
      };
    } catch (error) {
      throw new BadRequestException(
        'Failed to create request: ' + error.message,
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
          status: true,
          created_at: true,
          attachments: {
            select: { path: true },
          },
          seeker: {
            select: {
              id: true,
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
      status: req.status,
      skills: req.skills_needed.join(', '),
      attachments: req.attachments.map((attachment) => ({
        path: TajulStorage.url(
          `${appConfig().storageUrl.requests}${attachment.path}`,
        ),
      })),
      time_ago: formatDistanceToNow(req.created_at, { addSuffix: true }),
      user: {
        id: req.seeker.id,
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

  async getCompletedRequests(query: {
    page?: number;
    limit?: number;
    user_id: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filter for COMPLETED status where user is either Seeker or Volunteer
    const whereCondition: Prisma.RequestWhereInput = {
      status: RequestStatus.ACCEPTED, // Changed from ACCEPTED to COMPLETED based on your logic
      OR: [{ seeker_id: query.user_id }, { volunteer_id: query.user_id }],
    };

    // 1. Fetch total count and data in parallel
    const [total, requests] = await Promise.all([
      this.prisma.request.count({ where: whereCondition }),
      this.prisma.request.findMany({
        where: whereCondition,
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          location: true,
          estimated_duration: true,
          urgency_level: true,
          skills_needed: true,
          status: true,
          created_at: true,
          attachments: {
            select: { path: true },
          },
          seeker: {
            select: {
              id: true,
              name: true,
              username: true,
              avatar: true,
            },
          },
          volunteer: {
            // Added volunteer info since the user might be the seeker
            select: {
              id: true,
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
      throw new NotFoundException('No completed requests found for this user');
    }

    // 2. Map data
    const mappedData = requests.map((req) => {
      // Determine the "Other Party" to show in the UI (if I am seeker, show volunteer and vice versa)
      const isSeeker = req.seeker.id === query.user_id;
      const otherParty = isSeeker ? req.volunteer : req.seeker;

      return {
        id: req.id,
        title: req.title,
        description: req.description,
        priority: req.urgency_level,
        category: req.category,
        location: req.location,
        duration: req.estimated_duration,
        status: req.status,
        role_in_request: isSeeker ? 'SEEKER' : 'VOLUNTEER',
        skills: req.skills_needed.join(', '),
        attachments: req.attachments.map((attachment) => ({
          url: TajulStorage.url(
            `${appConfig().storageUrl.requests}/${attachment.path}`,
          ),
        })),
        time_ago: formatDistanceToNow(new Date(req.created_at), {
          addSuffix: true,
        }),
        // Display the person the user interacted with
        counterpart: otherParty
          ? {
              id: otherParty.id,
              name: otherParty.name,
              username: otherParty.username
                ? `@${otherParty.username}`
                : `@${otherParty.name.toLowerCase().replace(/\s+/g, '')}`,
              avatar: otherParty.avatar
                ? TajulStorage.url(
                    `${appConfig().storageUrl.avatar}/${otherParty.avatar}`,
                  )
                : null,
            }
          : null,
      };
    });

    return {
      success: true,
      message: 'Completed requests history fetched successfully',
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
          status: true,
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
      complete: counts.find((c) => c.status === 'ACCEPTED')?._count._all || 0,
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
      status: req.status,
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
      include: {
        attachments: { select: { path: true } },
        seeker: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
          },
        },
        feedbacks: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    });

    if (!req) {
      throw new NotFoundException(`Request not found`);
    }

    // ডাটা ম্যাপিং
    const mappedData = {
      id: req.id,
      title: req.title,
      description: req.description,
      status: req.status,
      priority: req.urgency_level,
      category: req.category,
      location: req.location,
      duration: req.estimated_duration,
      skills: req.skills_needed.join(', '),
      attachments: req.attachments.map((attachment) => ({
        url: TajulStorage.url(
          `${appConfig().storageUrl.requests}/${attachment.path}`,
        ),
      })),
      time_ago: formatDistanceToNow(new Date(req.created_at), {
        addSuffix: true,
      }),

      user: {
        id: req.seeker.id,
        name: req.seeker.name,
        username: req.seeker.username
          ? `@${req.seeker.username}`
          : `@${req.seeker.name.toLowerCase().replace(/\s+/g, '')}`,
        avatar: req.seeker.avatar
          ? TajulStorage.url(
              `${appConfig().storageUrl.avatar}/${req.seeker.avatar}`,
            )
          : null,
      },

      feedbacks: req.feedbacks.map((f) => {
        let role = 'OTHER';
        if (f.user_id === req.seeker_id) role = 'SEEKER';
        else if (f.user_id === req.volunteer_id) role = 'VOLUNTEER';

        return {
          id: f.id,
          rating: f.rating_type,
          comment: f.comment,
          type: role,
          created_at: f.created_at,
          author: {
            id: f.user.id,
            name: f.user.name,
            avatar: f.user.avatar
              ? TajulStorage.url(
                  `${appConfig().storageUrl.avatar}/${f.user.avatar}`,
                )
              : null,
          },
        };
      }),
    };

    return {
      success: true,
      message: 'Request details and feedbacks fetched successfully',
      data: mappedData,
    };
  }

  async acceptRequest(user_id: string, request_id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { type: true, name: true },
    });

    if (!user) throw new NotFoundException('User not found');

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

    // send notification to seeker

    const updatedRequest = await this.prisma.request.update({
      where: { id: request_id },
      data: {
        volunteer_id: user_id,
        status: RequestStatus.ACCEPTED,
      },
    });

    if (updatedRequest) {
      const notificationPayload: any = {
        sender_id: user_id,
        receiver_id: request.seeker_id,
        text: `Your request has been accepted by ${user.name}`,
        type: 'request_accepted',
        entity_id: request.id,
      };

      return NotificationRepository.createNotification(notificationPayload);
    }

    return {
      success: true,
      message: 'Request accepted successfully',
      data: updatedRequest,
    };
  }

  // 3. Complete & Give Feedback
  async submitFeedback(
    user_id: string,
    request_id: string,
    dto: CreateFeedbackDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: user_id },
      select: { type: true, name: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const request = await this.prisma.request.findUnique({
      where: { id: request_id },
      include: { feedbacks: true },
    });

    if (!request) throw new NotFoundException('Request not found');

    const isSeeker = request.seeker_id === user_id;
    const isVolunteer = request.volunteer_id === user_id;

    console.log('isSeeker', isSeeker, 'isVolunteer', isVolunteer);

    if (!isSeeker && !isVolunteer) {
      throw new ForbiddenException('You are not authorized to give feedback');
    }

    const alreadyGaveFeedback = request.feedbacks.some(
      (f) => f.user_id === user_id,
    );
    if (alreadyGaveFeedback) {
      throw new BadRequestException(
        'You have already submitted feedback for this request',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const newFeedback = await tx.feedback.create({
        data: {
          rating_type: dto.rating_type,
          comment: dto.comment,
          request_id: request_id,
          user_id: user_id,
        },
      });

      if (request.status !== RequestStatus.COMPLETED) {
        await tx.request.update({
          where: { id: request_id },
          data: { status: RequestStatus.COMPLETED },
        });
      }

      if (isVolunteer) {
        await tx.user.update({
          where: { id: user_id },
          data: { points: { increment: 1 } },
        });
      }

      // Dynamic Notification logic
      const receiverId = isSeeker ? request.volunteer_id : request.seeker_id;

      // Jodi receiver_id null thake (e.g. volunteer ekhono assigned hoyni kintu system feedback allow korche),
      // tahole notification skip korai bhalo.
      if (receiverId) {
        const notificationPayload = {
          sender_id: user_id,
          receiver_id: receiverId,
          text: `${user.name} submitted feedback for the request`,
          type: 'feedback_submitted' as any,
          entity_id: request.id,
        };

        await NotificationRepository.createNotification(notificationPayload);
      }

      return {
        success: true,
        message: 'Feedback submitted and request marked as completed',
        data: newFeedback,
      };
    });
  }
}
