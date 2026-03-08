    import { Module } from '@nestjs/common';
import { StreamController } from './stream.controller';
import { StreamService } from './stream.service';
import { LivekitModule } from '../livekit/livekit.module';

@Module({
  imports: [LivekitModule],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}