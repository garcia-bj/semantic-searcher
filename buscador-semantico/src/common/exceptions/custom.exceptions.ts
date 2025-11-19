import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Excepción para errores de parseo de ontologías
 */
export class OntologyParseException extends HttpException {
    constructor(message: string, details?: string) {
        super(
            {
                message: 'Error al parsear la ontología',
                details: details || message,
                error: 'OntologyParseError',
            },
            HttpStatus.BAD_REQUEST,
        );
    }
}

/**
 * Excepción para ontologías no encontradas
 */
export class OntologyNotFoundException extends HttpException {
    constructor(id: number) {
        super(
            {
                message: `Ontología con ID ${id} no encontrada`,
                error: 'OntologyNotFound',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}

/**
 * Excepción para errores de razonamiento
 */
export class ReasoningException extends HttpException {
    constructor(message: string) {
        super(
            {
                message: 'Error en el razonamiento semántico',
                details: message,
                error: 'ReasoningError',
            },
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }
}

/**
 * Excepción para búsquedas sin resultados
 */
export class NoSearchResultsException extends HttpException {
    constructor(query: string) {
        super(
            {
                message: `No se encontraron resultados para: "${query}"`,
                error: 'NoSearchResults',
            },
            HttpStatus.NOT_FOUND,
        );
    }
}
