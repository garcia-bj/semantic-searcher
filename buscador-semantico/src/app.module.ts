import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OwlModule } from './modules/owl/owl.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [PrismaModule, OwlModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
