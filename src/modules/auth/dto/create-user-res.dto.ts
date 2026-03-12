import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { UserType } from 'prisma/generated';

export class CreateUserResDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: '019948547647' })
  @ApiProperty()
  phone_number?: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;

  @ApiPropertyOptional({
    enum: UserType,
    default: UserType.SEEKER,
  })
  @ApiProperty({ example: UserType.SEEKER })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;
}

export class LoginUserResDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  password: string;
}
export class ForgotPasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;
}

export class VerifyTokenDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '156545' })
  @IsString()
  token: string;
}

export class ChangePasswordDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  old_password: string;

  @ApiProperty({ example: 'password123' })
  @MinLength(8, { message: 'Password should be minimum 8 characters' })
  new_password: string;
}
