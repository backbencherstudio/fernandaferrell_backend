import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { DepositeService } from './deposite.service';

import { ApiExcludeController } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateDepositDto } from './dto/create-deposite.dto';

@ApiExcludeController()
@UseGuards(JwtAuthGuard)
@Controller('deposite')
export class DepositeController {
  constructor(private readonly depositeService: DepositeService) {}

  // add deposite
  @Post('add-balance')
  create(@Body() createDepositDto: CreateDepositDto, @Req() req: any) {
    const userId = req.user.userId;
    return this.depositeService.create(createDepositDto, userId);
  }
}
