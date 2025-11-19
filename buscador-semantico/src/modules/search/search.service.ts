import { Injectable } from '@nestjs/common';
import { SemanticEngine } from '../../core/semantic/semantic-engine';
import { SearchQueryDto, SuggestQueryDto } from './dto/search-query.dto';
import { SearchResponseDto, SuggestResponseDto } from './dto/search-response.dto';

@Injectable()
export class SearchService {
    constructor(private semanticEngine: SemanticEngine) { }

    /**
     * Realiza búsqueda semántica
     */
    async search(queryDto: SearchQueryDto): Promise<SearchResponseDto> {
        const result = await this.semanticEngine.search({
            query: queryDto.query,
            ontologyId: queryDto.ontologyId,
            type: queryDto.type,
            limit: queryDto.limit,
            minScore: queryDto.minScore,
            expandQuery: queryDto.expandQuery,
        });

        return result;
    }

    /**
     * Encuentra conceptos relacionados a un IRI
     */
    async findRelated(
        iri: string,
        ontologyId?: number,
        limit?: number,
    ): Promise<SearchResponseDto> {
        const results = await this.semanticEngine.findRelated(iri, ontologyId, limit);

        return {
            results,
            total: results.length,
            took: 0,
            query: iri,
        };
    }

    /**
     * Sugiere autocompletado
     */
    async suggest(queryDto: SuggestQueryDto): Promise<SuggestResponseDto> {
        const suggestions = await this.semanticEngine.suggest(
            queryDto.query,
            queryDto.ontologyId,
            queryDto.limit,
        );

        return {
            suggestions,
            query: queryDto.query,
        };
    }

    /**
     * Limpia el cache de búsqueda
     */
    clearCache(): void {
        this.semanticEngine.clearCache();
    }
}
