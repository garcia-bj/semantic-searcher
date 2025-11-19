import { Module } from '@nestjs/common';
import { OwlController } from './owl.controller';
import { OwlService } from './owl.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OwlController],
    providers: [OwlService],
    exports: [OwlService],
})
export class OwlModule { }
