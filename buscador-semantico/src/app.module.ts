import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { OwlModule } from './modules/owl/owl.module';
import { ReasonerModule } from './core/ontology/reasoner/reasoner.module';
import { SearchModule } from './modules/search/search.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [PrismaModule, ReasonerModule, OwlModule, SearchModule, UploadModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
