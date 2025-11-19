/**
 * Tipos de reglas de inferencia soportadas
 */
export enum InferenceRuleType {
    // Reglas RDFS
    RDFS_SUBCLASS_OF = 'rdfs:subClassOf',
    RDFS_SUBPROPERTY_OF = 'rdfs:subPropertyOf',
    RDFS_DOMAIN = 'rdfs:domain',
    RDFS_RANGE = 'rdfs:range',

    // Reglas OWL
    OWL_EQUIVALENT_CLASS = 'owl:equivalentClass',
    OWL_SAME_AS = 'owl:sameAs',
    OWL_INVERSE_OF = 'owl:inverseOf',
    OWL_TRANSITIVE_PROPERTY = 'owl:TransitiveProperty',
    OWL_SYMMETRIC_PROPERTY = 'owl:SymmetricProperty',
    OWL_FUNCTIONAL_PROPERTY = 'owl:FunctionalProperty',
    OWL_INVERSE_FUNCTIONAL_PROPERTY = 'owl:InverseFunctionalProperty',

    // Reglas personalizadas
    CUSTOM = 'custom',
}

/**
 * Representa una tripla inferida
 */
export interface InferredTriple {
    subject: string;
    predicate: string;
    object: string;
    isLiteral: boolean;
    datatype?: string;
    lang?: string;
    graph?: string;
    inferredBy: InferenceRuleType | string;
}

/**
 * Contexto para aplicación de reglas
 */
export interface InferenceContext {
    documentId: number;
    graph?: string;
    maxIterations?: number;
    enabledRules?: InferenceRuleType[];
}

/**
 * Resultado de la aplicación de reglas
 */
export interface InferenceResult {
    inferredTriples: InferredTriple[];
    iterations: number;
    rulesApplied: string[];
    inconsistencies: string[];
}

/**
 * Definición de una regla de inferencia
 */
export interface InferenceRule {
    name: InferenceRuleType | string;
    description: string;
    apply: (triples: TripleData[], context: InferenceContext) => InferredTriple[];
}

/**
 * Datos de una tripla para razonamiento
 */
export interface TripleData {
    id?: number;
    subject: string;
    predicate: string;
    object: string;
    isLiteral: boolean;
    datatype?: string;
    lang?: string;
    graph?: string;
    isInferred?: boolean;
    inferredBy?: string;
}

/**
 * Configuración de niveles de razonamiento
 */
export enum ReasoningLevel {
    NONE = 'none',           // Sin razonamiento
    RDFS = 'rdfs',           // Solo reglas RDFS
    OWL_LITE = 'owl-lite',   // RDFS + OWL Lite
    OWL_DL = 'owl-dl',       // RDFS + OWL DL (más completo)
}

/**
 * Estadísticas de razonamiento
 */
export interface ReasoningStats {
    totalExplicitTriples: number;
    totalInferredTriples: number;
    inferencesByRule: Record<string, number>;
    processingTimeMs: number;
    iterations: number;
}
