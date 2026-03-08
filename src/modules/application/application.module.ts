import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { NotificationModule } from './notification/notification.module';
import { PostcommunityModule } from './postcommunity/postcommunity.module';
import { RequestModule } from 'src/modules/application/request/request.module';
import { StreamModule } from 'src/modules/application/live/stream/stream.module';
import { CallModule } from 'src/modules/application/live/call/call.module';
import { LivekitModule } from 'src/modules/application/live/livekit/livekit.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    FaqModule,
    PostcommunityModule,
    RequestModule,
    StreamModule,
    CallModule,
    LivekitModule,
  ],
})
export class ApplicationModule {}
