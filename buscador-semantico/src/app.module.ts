import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OwlModule } from './modules/owl/owl.module';

@Module({
  imports: [PrismaModule, OwlModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
