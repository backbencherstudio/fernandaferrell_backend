import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitiateCallDto {
  @ApiProperty({
    example: 'receiver_jkhfuigwebger7g34',
    description: 'Receiver user id',
  })
  @IsString()
  receiver_id: string;

  @ApiProperty({
    example: 'VIDEO',
    description: 'Call type',
  })
  @IsString()
  call_type: 'AUDIO' | 'VIDEO';
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

export class CallTerminateDto {
  @ApiProperty({
    example: 'call_jkhfuigwebger7g34_user_123',
    description: 'Room name',
  })
  @IsString()
  room_name: string;

  @ApiProperty({
    example: 'REJECTED',
    description: 'Call status',
  })
  @IsString()
  status: 'REJECTED' | 'ENDED' | 'MISSED';
}

export class TerminateCallDto {
  @ApiProperty({
    example: 'call_jkhfuigwebger7g34_user_123',
    description: 'Room name',
  })
  @IsString()
  room_name: string;

  @ApiProperty({
    example: 'REJECTED',
    description: 'Call status',
  })
  @IsString()
  status: 'REJECTED' | 'ENDED' | 'MISSED';
}
