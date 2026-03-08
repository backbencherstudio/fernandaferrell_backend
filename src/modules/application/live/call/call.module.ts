import { Module } from '@nestjs/common';
import { CallController } from './call.controller';
import { LivekitModule } from '../livekit/livekit.module';
import { CallService } from './call.service';

@Module({
  imports: [LivekitModule],
  controllers: [CallController],
  providers: [CallService],
})
export class CallModule {}