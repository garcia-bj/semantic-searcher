/**
 * Tipos centralizados para ontologías OWL/RDF
 */

/**
 * Formato de archivo RDF soportado
 */
export enum RdfFormat {
    RDF_XML = 'application/rdf+xml',
    TURTLE = 'text/turtle',
    N3 = 'text/n3',
    N_TRIPLES = 'application/n-triples',
    N_QUADS = 'application/n-quads',
    TRIG = 'application/trig',
}

/**
 * Tripla RDF normalizada
 */
export interface RdfTriple {
    subject: string;
    predicate: string;
    object: string;
    isLiteral: boolean;
    datatype?: string;
    lang?: string;
    graph?: string;
}

/**
 * Metadatos de una ontología
 */
export interface OntologyMetadata {
    iri?: string;
    version?: string;
    title?: string;
    description?: string;
    classes: Set<string>;
    properties: Set<string>;
    individuals: Set<string>;
    prefixes: Map<string, string>;
}

/**
 * Resultado del parseo de una ontología
 */
export interface ParseResult {
    triples: RdfTriple[];
    metadata: OntologyMetadata;
    format: RdfFormat;
}

/**
 * Archivo OWL cargado
 */
export interface LoadedOWLFile {
    content: string;
    format: RdfFormat;
    filename: string;
}

/**
 * Estadísticas de una ontología
 */
export interface OntologyStats {
    totalTriples: number;
    explicitTriples: number;
    inferredTriples: number;
    classCount: number;
    propertyCount: number;
    individualCount: number;
    namespaces: Record<string, string>;
}

/**
 * Tipo de entidad en la ontología
 */
export enum EntityType {
    CLASS = 'Class',
    PROPERTY = 'Property',
    INDIVIDUAL = 'Individual',
    DATATYPE = 'Datatype',
}

/**
 * Entidad de ontología
 */
export interface OntologyEntity {
    iri: string;
    type: EntityType;
    label?: string;
    comment?: string;
    deprecated?: boolean;
}
