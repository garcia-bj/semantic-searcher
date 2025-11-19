import * as N3 from 'n3';
import { LoadedOWLFile, RDFFormat } from './owl-loader';
import {
    isLiteral,
    isNamedNode,
    termToString,
    getLiteralDatatype,
    getLiteralLanguage,
    extractPrefixes,
} from './rdf-utils';

export interface ParsedTriple {
    subject: string;
    predicate: string;
    object: string;
    isLiteral: boolean;
    datatype?: string;
    lang?: string;
    graph?: string;
}

export interface OntologyMetadata {
    iri?: string;
    prefixes: Map<string, string>;
    tripleCount: number;
    classes: Set<string>;
    properties: Set<string>;
    individuals: Set<string>;
}

export interface ParseResult {
    triples: ParsedTriple[];
    metadata: OntologyMetadata;
}

/**
 * Convierte el formato RDFFormat a string de formato N3
 */
function getN3Format(format: RDFFormat): string {
    switch (format) {
        case RDFFormat.RDFXML:
            return 'application/rdf+xml';
        case RDFFormat.TURTLE:
            return 'text/turtle';
        case RDFFormat.N3:
            return 'text/n3';
        case RDFFormat.NTRIPLES:
            return 'application/n-triples';
        case RDFFormat.NQUADS:
            return 'application/n-quads';
        case RDFFormat.TRIG:
            return 'application/trig';
        default:
            return 'text/turtle';
    }
}

/**
 * Parsea un archivo OWL/RDF y extrae las triplas
 */
export async function parseOWL(file: LoadedOWLFile): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        const parser = new N3.Parser({ format: getN3Format(file.format) });
        const quads: N3.Quad[] = [];
        const triples: ParsedTriple[] = [];

        // Conjuntos para estadísticas
        const classes = new Set<string>();
        const properties = new Set<string>();
        const individuals = new Set<string>();
        let ontologyIRI: string | undefined;

        parser.parse(file.content, (error, quad, prefixes) => {
            if (error) {
                reject(new Error(`Parse error: ${error.message}`));
                return;
            }

            if (quad) {
                quads.push(quad);

                // Convertir quad a triple normalizada
                const triple: ParsedTriple = {
                    subject: termToString(quad.subject),
                    predicate: termToString(quad.predicate),
                    object: termToString(quad.object),
                    isLiteral: isLiteral(quad.object),
                    graph: quad.graph && isNamedNode(quad.graph) ? quad.graph.value : undefined,
                };

                // Extraer datatype y language si es literal
                if (isLiteral(quad.object)) {
                    const datatype = getLiteralDatatype(quad.object);
                    const lang = getLiteralLanguage(quad.object);

                    if (datatype) {
                        triple.datatype = datatype;
                    }
                    if (lang) {
                        triple.lang = lang;
                    }
                }

                triples.push(triple);

                // Recolectar metadatos
                collectMetadata(quad, classes, properties, individuals);

                // Detectar IRI de la ontología
                if (quad.predicate.value === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
                    quad.object.value === 'http://www.w3.org/2002/07/owl#Ontology') {
                    ontologyIRI = quad.subject.value;
                }
            } else {
                // Parsing completado
                const extractedPrefixes = extractPrefixes(quads);

                const metadata: OntologyMetadata = {
                    iri: ontologyIRI,
                    prefixes: extractedPrefixes,
                    tripleCount: triples.length,
                    classes,
                    properties,
                    individuals,
                };

                resolve({
                    triples,
                    metadata,
                });
            }
        });
    });
}

/**
 * Recolecta metadatos de las triplas (clases, propiedades, individuos)
 */
function collectMetadata(
    quad: N3.Quad,
    classes: Set<string>,
    properties: Set<string>,
    individuals: Set<string>,
): void {
    const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
    const OWL_CLASS = 'http://www.w3.org/2002/07/owl#Class';
    const RDFS_CLASS = 'http://www.w3.org/2000/01/rdf-schema#Class';
    const OWL_OBJECT_PROPERTY = 'http://www.w3.org/2002/07/owl#ObjectProperty';
    const OWL_DATATYPE_PROPERTY = 'http://www.w3.org/2002/07/owl#DatatypeProperty';
    const RDF_PROPERTY = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property';

    if (quad.predicate.value === RDF_TYPE && isNamedNode(quad.object)) {
        const objectValue = quad.object.value;

        // Es una clase
        if (objectValue === OWL_CLASS || objectValue === RDFS_CLASS) {
            classes.add(quad.subject.value);
        }
        // Es una propiedad
        else if (objectValue === OWL_OBJECT_PROPERTY ||
            objectValue === OWL_DATATYPE_PROPERTY ||
            objectValue === RDF_PROPERTY) {
            properties.add(quad.subject.value);
        }
        // Es un individuo (instancia de alguna clase)
        else {
            individuals.add(quad.subject.value);
        }
    }

    // Detectar propiedades por su uso como predicado
    if (isNamedNode(quad.predicate) &&
        !quad.predicate.value.startsWith('http://www.w3.org/1999/02/22-rdf-syntax-ns#') &&
        !quad.predicate.value.startsWith('http://www.w3.org/2000/01/rdf-schema#') &&
        !quad.predicate.value.startsWith('http://www.w3.org/2002/07/owl#')) {
        properties.add(quad.predicate.value);
    }
}

/**
 * Parsea múltiples archivos OWL y combina los resultados
 */
export async function parseMultipleOWL(files: LoadedOWLFile[]): Promise<ParseResult> {
    const allTriples: ParsedTriple[] = [];
    const allClasses = new Set<string>();
    const allProperties = new Set<string>();
    const allIndividuals = new Set<string>();
    const allPrefixes = new Map<string, string>();
    let mainOntologyIRI: string | undefined;

    for (const file of files) {
        const result = await parseOWL(file);

        allTriples.push(...result.triples);

        result.metadata.classes.forEach(c => allClasses.add(c));
        result.metadata.properties.forEach(p => allProperties.add(p));
        result.metadata.individuals.forEach(i => allIndividuals.add(i));

        result.metadata.prefixes.forEach((ns, prefix) => {
            if (!allPrefixes.has(prefix)) {
                allPrefixes.set(prefix, ns);
            }
        });

        if (result.metadata.iri && !mainOntologyIRI) {
            mainOntologyIRI = result.metadata.iri;
        }
    }

    return {
        triples: allTriples,
        metadata: {
            iri: mainOntologyIRI,
            prefixes: allPrefixes,
            tripleCount: allTriples.length,
            classes: allClasses,
            properties: allProperties,
            individuals: allIndividuals,
        },
    };
}
