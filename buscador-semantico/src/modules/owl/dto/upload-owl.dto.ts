import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadOwlDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description: 'Archivo OWL/RDF a subir',
    })
    file: Express.Multer.File;

    @ApiPropertyOptional({
        description: 'Descripción opcional de la ontología',
        maxLength: 500,
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({
        description: 'Etiquetas separadas por comas',
        example: 'medicina, ontología, salud',
    })
    @IsOptional()
    @IsString()
    tags?: string;
}
