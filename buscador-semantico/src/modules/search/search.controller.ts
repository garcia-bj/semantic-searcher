import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    Param,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchQueryDto, SuggestQueryDto } from './dto/search-query.dto';
import { SearchResponseDto, SuggestResponseDto } from './dto/search-response.dto';

@ApiTags('Semantic Search')
@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Búsqueda semántica',
        description: 'Busca conceptos en la ontología usando similitud semántica',
    })
    @ApiResponse({
        status: 200,
        description: 'Resultados de la búsqueda',
        type: SearchResponseDto,
    })
    async search(@Body() queryDto: SearchQueryDto): Promise<SearchResponseDto> {
        return this.searchService.search(queryDto);
    }

    @Get('suggest')
    @ApiOperation({
        summary: 'Autocompletado',
        description: 'Sugiere términos basándose en una entrada parcial',
    })
    @ApiQuery({ name: 'query', description: 'Término parcial', example: 'pers' })
    @ApiQuery({ name: 'ontologyId', required: false, description: 'ID de ontología' })
    @ApiQuery({ name: 'limit', required: false, description: 'Número de sugerencias' })
    @ApiResponse({
        status: 200,
        description: 'Sugerencias de autocompletado',
        type: SuggestResponseDto,
    })
    async suggest(@Query() queryDto: SuggestQueryDto): Promise<SuggestResponseDto> {
        return this.searchService.suggest(queryDto);
    }

    @Get('related/:iri')
    @ApiOperation({
        summary: 'Conceptos relacionados',
        description: 'Encuentra conceptos semánticamente relacionados a un IRI dado',
    })
    @ApiParam({ name: 'iri', description: 'IRI del concepto' })
    @ApiQuery({ name: 'ontologyId', required: false, description: 'ID de ontología' })
    @ApiQuery({ name: 'limit', required: false, description: 'Número de resultados' })
    @ApiResponse({
        status: 200,
        description: 'Conceptos relacionados',
        type: SearchResponseDto,
    })
    async findRelated(
        @Param('iri') iri: string,
        @Query('ontologyId', new ParseIntPipe({ optional: true })) ontologyId?: number,
        @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    ): Promise<SearchResponseDto> {
        return this.searchService.findRelated(decodeURIComponent(iri), ontologyId, limit);
    }

    @Post('cache/clear')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Limpiar cache',
        description: 'Limpia el cache de búsqueda semántica',
    })
    @ApiResponse({
        status: 204,
        description: 'Cache limpiado exitosamente',
    })
    async clearCache(): Promise<void> {
        this.searchService.clearCache();
    }
}
