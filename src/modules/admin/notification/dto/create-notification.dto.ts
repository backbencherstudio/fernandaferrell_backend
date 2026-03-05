import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Sender ID',
  })
  @IsNotEmpty()
  @IsString()
  sender_id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Receiver ID',
  })
  @IsNotEmpty()
  @IsString()
  receiver_id: string;

  @ApiProperty({
    example: 'Notification message',
    description: 'Notification message',
  })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Entity ID',
  })
  @IsNotEmpty()
  @IsString()
  entity_id: string;
}




class UserMinifiedDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) avatar: string | null;
}

export class NotificationResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() sender_id: string;
  @ApiProperty() receiver_id: string;
  @ApiProperty() entity_id: string;
  @ApiProperty() created_at: Date;
  
  @ApiProperty({ type: UserMinifiedDto })
  sender: UserMinifiedDto;

  @ApiProperty({ type: UserMinifiedDto })
  receiver: UserMinifiedDto;

  @ApiProperty({ nullable: true })
  notification_event: any | null;
}

export class NotificationListResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];
}
