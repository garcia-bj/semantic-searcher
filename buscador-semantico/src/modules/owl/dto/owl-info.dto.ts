import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OwlInfoDto {
    @ApiProperty({ description: 'ID del documento OWL' })
    id: number;

    @ApiProperty({ description: 'Nombre del archivo' })
    fileName: string;

    @ApiProperty({ description: 'Nombre original del archivo' })
    originalName: string;

    @ApiProperty({ description: 'Tipo MIME' })
    mimeType: string;

    @ApiProperty({ description: 'Tamaño en bytes' })
    size: number;

    @ApiProperty({ description: 'Fecha de subida' })
    uploadedAt: Date;

    @ApiPropertyOptional({ description: 'Fecha de parseo' })
    parsedAt?: Date;

    @ApiProperty({ description: 'Número de triplas' })
    tripleCount: number;

    @ApiProperty({ description: 'Indica si hubo error en el parseo' })
    hasError: boolean;

    @ApiPropertyOptional({ description: 'Mensaje de error si lo hubo' })
    errorMessage?: string;
}

export class OntologyStatsDto {
    @ApiProperty({ description: 'ID del documento' })
    id: number;

    @ApiProperty({ description: 'IRI de la ontología' })
    ontologyIRI?: string;

    @ApiProperty({ description: 'Número total de triplas' })
    totalTriples: number;

    @ApiProperty({ description: 'Número de clases' })
    classCount: number;

    @ApiProperty({ description: 'Número de propiedades' })
    propertyCount: number;

    @ApiProperty({ description: 'Número de individuos' })
    individualCount: number;

    @ApiProperty({ description: 'Namespaces/prefijos detectados' })
    namespaces: Record<string, string>;

    @ApiProperty({ description: 'Clases principales (top 10)' })
    topClasses: string[];

    @ApiProperty({ description: 'Propiedades principales (top 10)' })
    topProperties: string[];
}

export class UploadResponseDto {
    @ApiProperty({ description: 'Información del documento subido' })
    document: OwlInfoDto;

    @ApiProperty({ description: 'Estadísticas de la ontología' })
    stats: {
        totalTriples: number;
        classCount: number;
        propertyCount: number;
        individualCount: number;
        inferredTriples?: number;
    };

    @ApiProperty({ description: 'Mensaje de éxito' })
    message: string;
}
