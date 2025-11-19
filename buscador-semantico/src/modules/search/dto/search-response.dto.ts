import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchMatchDto {
    @ApiProperty({ description: 'Score total de similitud (0-1)' })
    score: number;

    @ApiProperty({ description: 'Score de similitud jerárquica' })
    hierarchyScore: number;

    @ApiProperty({ description: 'Score de similitud de propiedades' })
    propertyScore: number;

    @ApiProperty({ description: 'Score de similitud de etiquetas' })
    labelScore: number;

    @ApiProperty({ description: 'Detalles del match' })
    details: string;
}

export class SearchResultDto {
    @ApiProperty({ description: 'IRI del concepto' })
    iri: string;

    @ApiProperty({ description: 'Etiqueta o nombre del concepto' })
    label: string;

    @ApiProperty({
        description: 'Tipo de entidad',
        enum: ['Class', 'Property', 'Individual'],
    })
    type: 'Class' | 'Property' | 'Individual';

    @ApiProperty({ description: 'Score de relevancia (0-1)' })
    score: number;

    @ApiProperty({ description: 'Detalles del match semántico' })
    match: SearchMatchDto;

    @ApiPropertyOptional({ description: 'Descripción del concepto' })
    description?: string;

    @ApiPropertyOptional({ description: 'Namespace del concepto' })
    namespace?: string;
}

export class SearchResponseDto {
    @ApiProperty({
        description: 'Resultados de la búsqueda',
        type: [SearchResultDto],
    })
    results: SearchResultDto[];

    @ApiProperty({ description: 'Número total de resultados encontrados' })
    total: number;

    @ApiProperty({ description: 'Tiempo de búsqueda en milisegundos' })
    took: number;

    @ApiProperty({ description: 'Query original' })
    query: string;

    @ApiPropertyOptional({
        description: 'Términos expandidos usados en la búsqueda',
        type: [String],
    })
    expandedTerms?: string[];
}

export class SuggestResponseDto {
    @ApiProperty({
        description: 'Sugerencias de autocompletado',
        type: [String],
    })
    suggestions: string[];

    @ApiProperty({ description: 'Query original' })
    query: string;
}
