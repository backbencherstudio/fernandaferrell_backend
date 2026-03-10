import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { RequestCategory, UrgencyLevel } from 'prisma/generated';

export class CreateRequestDto {
  @ApiProperty({ example: 'E-commerce Website' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Full stack development needed' })
  @IsString() @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: RequestCategory })
  @IsEnum(RequestCategory)
  category: RequestCategory;

  @ApiProperty({ example: 'Dhaka, Bangladesh' })
  @IsString() @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: '2 weeks' })
  @IsOptional() @IsString()
  estimated_duration?: string;

  @ApiProperty({ enum: UrgencyLevel })
  @IsEnum(UrgencyLevel)
  urgency_level: UrgencyLevel;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') return value.split(',').map(v => v.trim());
    return value;
  })
  skills_needed: string[];

  @ApiPropertyOptional({ type: 'string', format: 'binary' })
  @IsOptional()
  file?: any; // Swagger field only
}




export class CreateFeedbackDto {
  @ApiProperty({
    example: true,
    description: 'Rating type (true for positive, false for negative)',
  })
  @Transform(({ value }) => {
    // form-data sends "true" as a string; this converts it to actual boolean
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
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
