import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitiateCallDto {
  @ApiProperty({
    example: 'receiver_jkhfuigwebger7g34',
    description: 'Receiver user id',
  })
  @IsString()
  receiver_id: string;
}

export class JoinCallDto {
  @ApiProperty({
    example: 'call_jkhfuigwebger7g34_user_123',
    description: 'Room name',
  })
  @IsString()
  room_name: string;
}

export class StartStreamDto {
  @ApiProperty({
    example: 'My Awesome Live Stream',
    description: 'Title of the live stream',
  })
  @IsString()
  title: string;
}
