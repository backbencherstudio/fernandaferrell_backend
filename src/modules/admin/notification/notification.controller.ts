import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationListResponse, UpdateNotificationDtoRes } from 'src/modules/admin/notification/dto/create-notification.dto';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { UpdateNotificationDto } from 'src/modules/application/notification/dto/update-notification.dto';

@ApiBearerAuth()
@ApiTags('Notification')
@UseGuards(JwtAuthGuard)
// @Roles(Role.ADMIN)
@Controller('admin/notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get all notifications' })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All notifications fetched successfully',
    type: [NotificationListResponse],
  })
  @Get()
  async findAll() {
    try {
      const notification = await this.notificationService.findAll();

      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }


  @Patch('update-settings')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: UpdateNotificationDtoRes })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notification settings updated successfully',
    type: [UpdateNotificationDtoRes],
  })
  async update(@Body() updateDto: UpdateNotificationDto, @Req() req: any) {
    const userId = req.user.id;
    return this.notificationService.updateSettings(userId, updateDto);
  }

  @ApiOperation({ summary: 'Delete notification' })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;
      const notification = await this.notificationService.remove(id, user_id);

      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete all notifications' })
  @Delete()
  async removeAll(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const notification = await this.notificationService.removeAll(user_id);

      return notification;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
