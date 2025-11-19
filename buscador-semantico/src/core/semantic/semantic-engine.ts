import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ConceptInfo,
    SemanticMatchResult,
    calculateSemanticSimilarity,
    findSimilarConcepts,
    stringSimilarity,
} from './semantic-match';
import { searchConfig } from '../../config/search.config';

export interface SearchQuery {
    query: string;
    ontologyId?: number;
    type?: 'Class' | 'Property' | 'Individual';
    limit?: number;
    minScore?: number;
    expandQuery?: boolean;
}

export interface SearchResult {
    iri: string;
    label: string;
    type: 'Class' | 'Property' | 'Individual';
    score: number;
    match: SemanticMatchResult;
    description?: string;
    namespace?: string;
}

export interface SearchResponse {
    results: SearchResult[];
    total: number;
    took: number;
    query: string;
    expandedTerms?: string[];
}

@Injectable()
export class SemanticEngine {
    private readonly logger = new Logger(SemanticEngine.name);
    private classHierarchyCache = new Map<number, Map<string, ConceptInfo>>();
    private searchCache = new Map<string, SearchResponse>();

    constructor(private prisma: PrismaService) { }

    /**
     * Realiza una búsqueda semántica
     */
    async search(searchQuery: SearchQuery): Promise<SearchResponse> {
        const startTime = Date.now();

        // Verificar cache
        const cacheKey = JSON.stringify(searchQuery);
        if (searchConfig.enableCache && this.searchCache.has(cacheKey)) {
            this.logger.debug(`Cache hit for query: ${searchQuery.query}`);
            return this.searchCache.get(cacheKey)!;
        }

        this.logger.log(`Searching for: "${searchQuery.query}"`);

        // Cargar conceptos de la ontología
        const concepts = await this.loadConcepts(searchQuery.ontologyId);

        if (concepts.length === 0) {
            return {
                results: [],
                total: 0,
                took: Date.now() - startTime,
                query: searchQuery.query,
            };
        }

        // Cargar jerarquía de clases
        const classHierarchy = await this.loadClassHierarchy(searchQuery.ontologyId);

        // Expandir query si está habilitado
        const expandedTerms: string[] = [];
        if (searchQuery.expandQuery !== false && searchConfig.expandQuery) {
            expandedTerms.push(...this.expandQueryTerms(searchQuery.query, concepts));
        }

        // Buscar conceptos que coincidan
        const matches: Array<{ concept: ConceptInfo; score: number; match: SemanticMatchResult }> = [];

        for (const concept of concepts) {
            // Filtrar por tipo si se especificó
            if (searchQuery.type && concept.type !== searchQuery.type) {
                continue;
            }

            // Calcular similitud con el query
            const score = this.calculateQuerySimilarity(
                searchQuery.query,
                concept,
                classHierarchy,
                expandedTerms,
            );

            if (score.score >= (searchQuery.minScore || searchConfig.minSimilarity)) {
                matches.push({ concept, score: score.score, match: score });
            }
        }

        // Ordenar por score
        matches.sort((a, b) => b.score - a.score);

        // Aplicar límite
        const limit = Math.min(
            searchQuery.limit || searchConfig.defaultLimit,
            searchConfig.maxLimit,
        );
        const topMatches = matches.slice(0, limit);

        // Convertir a SearchResult
        const results: SearchResult[] = topMatches.map(m => ({
            iri: m.concept.iri,
            label: m.concept.label || this.extractLocalName(m.concept.iri),
            type: m.concept.type,
            score: m.score,
            match: m.match,
            namespace: this.extractNamespace(m.concept.iri),
        }));

        const response: SearchResponse = {
            results,
            total: matches.length,
            took: Date.now() - startTime,
            query: searchQuery.query,
            expandedTerms: expandedTerms.length > 0 ? expandedTerms : undefined,
        };

        // Guardar en cache
        if (searchConfig.enableCache) {
            this.searchCache.set(cacheKey, response);

            // Limpiar cache si es muy grande
            if (this.searchCache.size > searchConfig.cacheSize) {
                const firstKey = this.searchCache.keys().next().value;
                this.searchCache.delete(firstKey);
            }
        }

        return response;
    }

    /**
     * Encuentra conceptos relacionados a un IRI dado
     */
    async findRelated(
        iri: string,
        ontologyId?: number,
        limit: number = 10,
    ): Promise<SearchResult[]> {
        this.logger.log(`Finding concepts related to: ${iri}`);

        const concepts = await this.loadConcepts(ontologyId);
        const classHierarchy = await this.loadClassHierarchy(ontologyId);

        // Encontrar el concepto target
        const targetConcept = concepts.find(c => c.iri === iri);
        if (!targetConcept) {
            return [];
        }

        // Encontrar similares
        const similar = findSimilarConcepts(
            targetConcept,
            concepts,
            classHierarchy,
            limit,
            searchConfig.minSimilarity,
        );

        return similar.map(s => ({
            iri: s.concept.iri,
            label: s.concept.label || this.extractLocalName(s.concept.iri),
            type: s.concept.type,
            score: s.match.score,
            match: s.match,
            namespace: this.extractNamespace(s.concept.iri),
        }));
    }

    /**
     * Sugiere autocompletado para un término parcial
     */
    async suggest(
        partialQuery: string,
        ontologyId?: number,
        limit: number = 5,
    ): Promise<string[]> {
        const concepts = await this.loadConcepts(ontologyId);

        const suggestions: Array<{ label: string; score: number }> = [];

        for (const concept of concepts) {
            const label = concept.label || this.extractLocalName(concept.iri);
            const score = stringSimilarity(partialQuery, label);

            if (score > 0.3) {
                suggestions.push({ label, score });
            }
        }

        suggestions.sort((a, b) => b.score - a.score);

        return suggestions.slice(0, limit).map(s => s.label);
    }

    /**
     * Calcula similitud entre un query y un concepto
     */
    private calculateQuerySimilarity(
        query: string,
        concept: ConceptInfo,
        classHierarchy: Map<string, ConceptInfo>,
        expandedTerms: string[],
    ): SemanticMatchResult {
        const label = concept.label || this.extractLocalName(concept.iri);

        // Similitud directa con el query
        let labelScore = stringSimilarity(query, label);

        // Boost si coincide con términos expandidos
        for (const term of expandedTerms) {
            const expandedScore = stringSimilarity(term, label);
            labelScore = Math.max(labelScore, expandedScore * 0.8); // 80% del score expandido
        }

        // Boost por tipo
        const typeBoost = searchConfig.typeBoost[concept.type] || 1.0;
        labelScore *= typeBoost;

        // Para clases, considerar jerarquía
        let hierarchyScore = 0;
        if (concept.type === 'Class') {
            // Buscar clases similares al query en la jerarquía
            for (const [iri, otherConcept] of classHierarchy) {
                const otherLabel = otherConcept.label || this.extractLocalName(iri);
                if (stringSimilarity(query, otherLabel) > 0.7) {
                    // Crear concepto temporal para el query
                    const queryAsConcept: ConceptInfo = {
                        iri: 'query',
                        type: 'Class',
                        label: query,
                    };

                    // Calcular similitud jerárquica
                    const similarity = calculateSemanticSimilarity(
                        queryAsConcept,
                        concept,
                        classHierarchy,
                        searchConfig.weights,
                    );

                    hierarchyScore = Math.max(hierarchyScore, similarity.hierarchyScore);
                }
            }
        }

        // Similitud de propiedades (básica)
        const propertyScore = concept.properties ? concept.properties.length * 0.01 : 0;

        // Combinar scores
        const totalScore =
            labelScore * searchConfig.weights.label +
            hierarchyScore * searchConfig.weights.hierarchy +
            propertyScore * searchConfig.weights.properties;

        return {
            score: Math.min(1.0, totalScore),
            labelScore,
            hierarchyScore,
            propertyScore,
            details: `Match: ${(totalScore * 100).toFixed(1)}%`,
        };
    }

    /**
     * Expande términos de búsqueda con sinónimos y variaciones
     */
    private expandQueryTerms(query: string, concepts: ConceptInfo[]): string[] {
        const expanded = new Set<string>();
        const normalizedQuery = query.toLowerCase();

        for (const concept of concepts) {
            const label = (concept.label || this.extractLocalName(concept.iri)).toLowerCase();

            // Si el label contiene el query o viceversa
            if (label.includes(normalizedQuery) || normalizedQuery.includes(label)) {
                expanded.add(label);

                // Agregar subclases si está habilitado
                if (searchConfig.includeSubclasses && concept.subClasses) {
                    concept.subClasses.forEach(sub => {
                        const subConcept = concepts.find(c => c.iri === sub);
                        if (subConcept && subConcept.label) {
                            expanded.add(subConcept.label.toLowerCase());
                        }
                    });
                }

                // Agregar superclases si está habilitado
                if (searchConfig.includeSuperclasses && concept.superClasses) {
                    concept.superClasses.forEach(sup => {
                        const supConcept = concepts.find(c => c.iri === sup);
                        if (supConcept && supConcept.label) {
                            expanded.add(supConcept.label.toLowerCase());
                        }
                    });
                }
            }
        }

        return Array.from(expanded);
    }

    /**
     * Carga todos los conceptos de una ontología
     */
    private async loadConcepts(ontologyId?: number): Promise<ConceptInfo[]> {
        const where = ontologyId ? { documentId: ontologyId } : {};

        const triples = await this.prisma.triple.findMany({
            where,
        });

        // Agrupar triplas por sujeto
        const conceptMap = new Map<string, ConceptInfo>();

        for (const triple of triples) {
            if (!conceptMap.has(triple.subject)) {
                conceptMap.set(triple.subject, {
                    iri: triple.subject,
                    type: 'Individual', // Default
                    properties: [],
                    superClasses: [],
                    subClasses: [],
                });
            }

            const concept = conceptMap.get(triple.subject)!;

            // Detectar tipo
            if (triple.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type') {
                if (triple.object === 'http://www.w3.org/2002/07/owl#Class' ||
                    triple.object === 'http://www.w3.org/2000/01/rdf-schema#Class') {
                    concept.type = 'Class';
                } else if (triple.object.includes('Property')) {
                    concept.type = 'Property';
                }
            }

            // Detectar label
            if (triple.predicate === 'http://www.w3.org/2000/01/rdf-schema#label') {
                concept.label = triple.object;
            }

            // Detectar superclases
            if (triple.predicate === 'http://www.w3.org/2000/01/rdf-schema#subClassOf') {
                concept.superClasses!.push(triple.object);
            }

            // Agregar propiedades
            if (!triple.predicate.startsWith('http://www.w3.org/')) {
                concept.properties!.push(triple.predicate);
            }
        }

        return Array.from(conceptMap.values());
    }

    /**
     * Carga la jerarquía de clases
     */
    private async loadClassHierarchy(ontologyId?: number): Promise<Map<string, ConceptInfo>> {
        // Verificar cache
        if (ontologyId && this.classHierarchyCache.has(ontologyId)) {
            return this.classHierarchyCache.get(ontologyId)!;
        }

        const concepts = await this.loadConcepts(ontologyId);
        const hierarchy = new Map<string, ConceptInfo>();

        concepts
            .filter(c => c.type === 'Class')
            .forEach(c => hierarchy.set(c.iri, c));

        // Guardar en cache
        if (ontologyId) {
            this.classHierarchyCache.set(ontologyId, hierarchy);
        }

        return hierarchy;
    }

    /**
     * Extrae el nombre local de una IRI
     */
    private extractLocalName(iri: string): string {
        const hashIndex = iri.lastIndexOf('#');
        const slashIndex = iri.lastIndexOf('/');
        const splitIndex = Math.max(hashIndex, slashIndex);
        return splitIndex >= 0 ? iri.substring(splitIndex + 1) : iri;
    }

    /**
     * Extrae el namespace de una IRI
     */
    private extractNamespace(iri: string): string {
        const hashIndex = iri.lastIndexOf('#');
        const slashIndex = iri.lastIndexOf('/');
        const splitIndex = Math.max(hashIndex, slashIndex);
        return splitIndex >= 0 ? iri.substring(0, splitIndex + 1) : '';
    }

    /**
     * Limpia el cache
     */
    clearCache(): void {
        this.searchCache.clear();
        this.classHierarchyCache.clear();
        this.logger.log('Cache cleared');
    }
}
