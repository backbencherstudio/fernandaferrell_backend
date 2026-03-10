import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RequestStatus, RequestCategory, UrgencyLevel } from 'prisma/generated';

export class AttachmentResponseDto {
  @ApiProperty({ example: 'uuid-123' })
  id: string;

  @ApiProperty({ example: 'https://cdn.example.com/image.jpg' })
  url: string;
}

export class UserMinifiedResponseDto {
  @ApiProperty({ example: 'uuid-user-456' })
  id: string;

  @ApiProperty({ example: 'Tajul Islam' })
  name: string;

  @ApiPropertyOptional({ example: 'dev.tajulislam505@gmail.com' })
  email?: string;
}

export class RequestResponseDto {
  @ApiProperty({ example: 'uuid-request-789' })
  id: string;

  @ApiProperty({ example: 'Website Development for E-commerce' })
  title: string;

  @ApiProperty({ example: 'Detailed project description...' })
  description: string;

  @ApiProperty({ enum: RequestCategory, example: RequestCategory.DURING_STORM })
  category: RequestCategory;

  @ApiProperty({ example: 'Dhaka, Bangladesh' })
  location: string;

  @ApiProperty({ type: [AttachmentResponseDto] })
  image_url: AttachmentResponseDto[];

  @ApiPropertyOptional({ example: '2 weeks', nullable: true })
  estimated_duration?: string;

  @ApiProperty({ enum: UrgencyLevel, example: UrgencyLevel.HIGH })
  urgency_level: UrgencyLevel;

  @ApiProperty({ example: ['Next.js', 'NestJS', 'PostgreSQL'] })
  skills_needed: string[];

  @ApiProperty({ enum: RequestStatus, example: RequestStatus.PENDING })
  status: RequestStatus;

  @ApiProperty({ type: UserMinifiedResponseDto })
  seeker: UserMinifiedResponseDto;

  @ApiPropertyOptional({ type: UserMinifiedResponseDto, nullable: true })
  volunteer?: UserMinifiedResponseDto;

  @ApiProperty({ example: '2026-03-09T12:00:00Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-03-09T12:00:00Z' })
  updated_at: Date;
}


export class FeedbackResponseDto {
  @ApiProperty({ example: 'uuid-feedback-111' })
  id: string;

  @ApiProperty({ example: true, description: 'Positive (true) or Negative (false)' })
  rating_type: boolean;

  @ApiPropertyOptional({ example: 'Great work on the backend!', nullable: true })
  comment?: string;

  @ApiProperty({ example: 'uuid-request-789' })
  request_id: string;

  @ApiProperty({ type: UserMinifiedResponseDto })
  provider: UserMinifiedResponseDto;

  @ApiProperty({ example: '2026-03-09T12:10:00Z' })
  created_at: Date;
}

export class CreateRequestResponseDto {
  @ApiProperty({ type: [RequestResponseDto] })
  data: RequestResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;
}