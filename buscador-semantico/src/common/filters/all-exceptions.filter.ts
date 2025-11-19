import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

/**
 * Filtro para capturar todas las excepciones no manejadas
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status = HttpStatus.INTERNAL_SERVER_ERROR;
        const message = exception instanceof Error ? exception.message : 'Error interno del servidor';

        // Log completo del error
        this.logger.error(
            `Unhandled Exception: ${message}`,
            exception instanceof Error ? exception.stack : 'No stack trace',
        );

        response.status(status).json({
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: (request as any).url,
            message: 'Error interno del servidor',
            error: 'InternalServerError',
        });
    }
}
