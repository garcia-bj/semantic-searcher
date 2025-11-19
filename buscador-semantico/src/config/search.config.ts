export const searchConfig = {
    // Threshold mínimo de similitud para considerar un resultado
    minSimilarity: 0.3,

    // Pesos para cada tipo de similitud (deben sumar 1.0)
    weights: {
        label: 0.4,       // Peso de similitud de etiquetas/nombres
        hierarchy: 0.3,   // Peso de similitud jerárquica (clases)
        properties: 0.3,  // Peso de similitud de propiedades
    },

    // Límites de resultados
    defaultLimit: 10,
    maxLimit: 100,

    // Query expansion
    expandQuery: true,
    maxExpansionDepth: 2,  // Cuántos niveles de jerarquía expandir
    includeSubclasses: true,
    includeSuperclasses: true,
    includeInstances: true,

    // Boost por tipo de entidad
    typeBoost: {
        Class: 1.2,        // Clases son más relevantes
        Property: 1.0,
        Individual: 0.8,
    },

    // Configuración de string matching
    stringMatching: {
        caseSensitive: false,
        removeAccents: true,
        fuzzyThreshold: 0.7,  // Threshold para fuzzy matching
    },

    // Cacheo de resultados
    enableCache: true,
    cacheSize: 1000,  // Número de queries a cachear
    cacheTTL: 3600,   // Tiempo de vida del cache en segundos (1 hora)

    // Faceted search
    enableFacets: true,
    facetFields: ['type', 'namespace', 'hasProperties'],
};
