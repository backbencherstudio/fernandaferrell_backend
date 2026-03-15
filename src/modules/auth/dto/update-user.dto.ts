import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  phone_number?: string;

  @ApiPropertyOptional({ example: 'John@gmail.com' })
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'image.jpg' })
  @IsOptional()
  avatar?: string;
}
