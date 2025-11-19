import { Module, Global } from '@nestjs/common';
import { ReasonerService } from './reasoner.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Global()
@Module({
    imports: [PrismaModule],
    providers: [ReasonerService],
    exports: [ReasonerService],
})
export class ReasonerModule { }
