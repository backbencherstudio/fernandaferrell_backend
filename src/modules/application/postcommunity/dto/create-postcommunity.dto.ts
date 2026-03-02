import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePostDto {
  @ApiProperty({ example: 'Heavy Rain Alert', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Attention to everyone in South West Florida...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    type: 'string',
    format: 'binary', 
    required: false,
  })

  @IsOptional()
  image_url?: any;

  @ApiProperty({ example: 'South West Florida', required: false })
  @IsString()
  @IsOptional()
  location_tag?: string;
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Thank you for the update!' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: 'Parent comment ID if it is a reply',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  parent_id?: string;
}
