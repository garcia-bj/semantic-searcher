import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SemanticEngine } from '../../core/semantic/semantic-engine';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [SearchController],
    providers: [SearchService, SemanticEngine],
    exports: [SearchService],
})
export class SearchModule { }
