/**
 * Tipos centralizados para razonamiento semántico
 */

/**
 * Tipo de regla de inferencia
 */
export enum InferenceRuleType {
    // RDFS Rules
    RDFS_SUBCLASS_OF = 'rdfs:subClassOf',
    RDFS_SUBPROPERTY_OF = 'rdfs:subPropertyOf',
    RDFS_DOMAIN = 'rdfs:domain',
    RDFS_RANGE = 'rdfs:range',

    // OWL Rules
    OWL_EQUIVALENT_CLASS = 'owl:equivalentClass',
    OWL_SAME_AS = 'owl:sameAs',
    OWL_INVERSE_OF = 'owl:inverseOf',
    OWL_TRANSITIVE_PROPERTY = 'owl:TransitiveProperty',
    OWL_SYMMETRIC_PROPERTY = 'owl:SymmetricProperty',

    // Custom Rules
    CUSTOM = 'custom',
}

/**
 * Nivel de razonamiento
 */
export enum ReasoningLevel {
    NONE = 'none',
    RDFS = 'rdfs',
    OWL_LITE = 'owl-lite',
    OWL_DL = 'owl-dl',
}

/**
 * Tripla inferida
 */
export interface InferredTriple {
    subject: string;
    predicate: string;
    object: string;
    isLiteral: boolean;
    datatype?: string;
    lang?: string;
    graph?: string;
    inferredBy: string;
}

/**
 * Contexto de inferencia
 */
export interface InferenceContext {
    documentId: number;
    graph?: string;
    maxIterations?: number;
    enabledRules?: InferenceRuleType[];
}

/**
 * Resultado de razonamiento
 */
export interface InferenceResult {
    inferredTriples: InferredTriple[];
    iterations: number;
    rulesApplied: string[];
    inconsistencies: string[];
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

/**
 * Datos de tripla para razonamiento
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
 * Regla de inferencia
 */
export interface InferenceRule {
    name: string;
    description: string;
    apply: (triples: TripleData[], context: InferenceContext) => InferredTriple[];
}
