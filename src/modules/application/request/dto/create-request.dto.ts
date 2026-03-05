import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { RequestCategory, UrgencyLevel } from 'prisma/generated'; // Ba tumar prisma generated path

/**
 * 1. Create Request DTO
 * UI: image_01da41.png (Request Help Form)
 */
export class CreateRequestDto {
  @ApiProperty({
    example: 'Website Development for E-commerce',
    description: 'Title of the service request',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example:
      'I need a full-stack developer to build an e-commerce website using Next.js and NestJS.',
    description: 'Detailed description of the request',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: RequestCategory.DURING_STORM,
    description: 'Category of the request',
    enum: RequestCategory,
  })
  @IsEnum(RequestCategory)
  category: RequestCategory;

  @ApiProperty({
    example: 'Dhaka, Bangladesh',
    description: 'Location where the service is required',
  })
  @IsString()
  location: string;

  @ApiPropertyOptional({
    example: '2 weeks',
    description: 'Estimated duration to complete the task',
  })
  @IsString()
  @IsOptional()
  estimated_duration?: string;

  @ApiProperty({
    example: UrgencyLevel.HIGH,
    description: 'Urgency level of the request',
    enum: UrgencyLevel,
  })
  @IsEnum(UrgencyLevel)
  urgency_level: UrgencyLevel;

  @ApiPropertyOptional({
    example: ['Next.js', 'NestJS', 'PostgreSQL'],
    description: 'List of required skills',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills_needed?: string[];
}

/**
 * 3. Create Feedback DTO
 * UI: image_01cf00.png (Complete Request Screen)
 */
export class CreateFeedbackDto {
  @ApiProperty({
    example: true,
    description: 'Rating type (true for positive, false for negative)',
  })
  @IsBoolean()
  @IsNotEmpty()
  rating_type: boolean;

  @ApiPropertyOptional({
    example: 'Great service!',
    description: 'Optional comment',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}
