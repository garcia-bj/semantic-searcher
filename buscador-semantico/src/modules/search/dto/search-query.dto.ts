import { IsString, IsOptional, IsInt, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SearchQueryDto {
    @ApiProperty({
        description: 'Término de búsqueda',
        example: 'persona',
    })
    @IsString()
    query: string;

    @ApiPropertyOptional({
        description: 'ID de la ontología donde buscar (opcional, busca en todas si no se especifica)',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    ontologyId?: number;

    @ApiPropertyOptional({
        description: 'Tipo de entidad a buscar',
        enum: ['Class', 'Property', 'Individual'],
        example: 'Class',
    })
    @IsOptional()
    @IsEnum(['Class', 'Property', 'Individual'])
    type?: 'Class' | 'Property' | 'Individual';

    @ApiPropertyOptional({
        description: 'Número máximo de resultados',
        example: 10,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    @Type(() => Number)
    limit?: number;

    @ApiPropertyOptional({
        description: 'Score mínimo de similitud (0-1)',
        example: 0.3,
        minimum: 0,
        maximum: 1,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    @Type(() => Number)
    minScore?: number;

    @ApiPropertyOptional({
        description: 'Expandir query con sinónimos y términos relacionados',
        example: true,
    })
    @IsOptional()
    expandQuery?: boolean;
}

export class SuggestQueryDto {
    @ApiProperty({
        description: 'Término parcial para autocompletado',
        example: 'pers',
    })
    @IsString()
    query: string;

    @ApiPropertyOptional({
        description: 'ID de la ontología',
        example: 1,
    })
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    ontologyId?: number;

    @ApiPropertyOptional({
        description: 'Número máximo de sugerencias',
        example: 5,
        minimum: 1,
        maximum: 20,
    })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    @Type(() => Number)
    limit?: number;
}
