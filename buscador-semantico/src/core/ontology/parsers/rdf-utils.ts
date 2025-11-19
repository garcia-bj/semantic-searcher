import * as N3 from 'n3';

/**
 * Normaliza una IRI/URI eliminando espacios y asegurando formato correcto
 */
export function normalizeIRI(iri: string): string {
  return iri.trim().replace(/\s+/g, '');
}

/**
 * Extrae el namespace de una IRI
 * Ejemplo: http://example.org/ontology#Person -> http://example.org/ontology#
 */
export function extractNamespace(iri: string): string {
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  
  if (hashIndex > slashIndex) {
    return iri.substring(0, hashIndex + 1);
  } else if (slashIndex >= 0) {
    return iri.substring(0, slashIndex + 1);
  }
  
  return iri;
}

/**
 * Extrae el nombre local de una IRI
 * Ejemplo: http://example.org/ontology#Person -> Person
 */
export function extractLocalName(iri: string): string {
  const hashIndex = iri.lastIndexOf('#');
  const slashIndex = iri.lastIndexOf('/');
  
  if (hashIndex > slashIndex) {
    return iri.substring(hashIndex + 1);
  } else if (slashIndex >= 0) {
    return iri.substring(slashIndex + 1);
  }
  
  return iri;
}

/**
 * Determina si un término RDF es un literal
 */
export function isLiteral(term: N3.Term): term is N3.Literal {
  return term.termType === 'Literal';
}

/**
 * Determina si un término RDF es una IRI/URI
 */
export function isNamedNode(term: N3.Term): term is N3.NamedNode {
  return term.termType === 'NamedNode';
}

/**
 * Determina si un término RDF es un BlankNode
 */
export function isBlankNode(term: N3.Term): term is N3.BlankNode {
  return term.termType === 'BlankNode';
}

/**
 * Convierte un literal RDF a su valor JavaScript nativo
 */
export function literalToValue(literal: N3.Literal): any {
  const datatype = literal.datatype?.value;
  const value = literal.value;

  if (!datatype || datatype === 'http://www.w3.org/2001/XMLSchema#string') {
    return value;
  }

  switch (datatype) {
    case 'http://www.w3.org/2001/XMLSchema#integer':
    case 'http://www.w3.org/2001/XMLSchema#int':
    case 'http://www.w3.org/2001/XMLSchema#long':
      return parseInt(value, 10);
    
    case 'http://www.w3.org/2001/XMLSchema#decimal':
    case 'http://www.w3.org/2001/XMLSchema#double':
    case 'http://www.w3.org/2001/XMLSchema#float':
      return parseFloat(value);
    
    case 'http://www.w3.org/2001/XMLSchema#boolean':
      return value === 'true' || value === '1';
    
    case 'http://www.w3.org/2001/XMLSchema#dateTime':
    case 'http://www.w3.org/2001/XMLSchema#date':
      return new Date(value);
    
    default:
      return value;
  }
}

/**
 * Extrae el datatype de un literal RDF
 */
export function getLiteralDatatype(literal: N3.Literal): string | null {
  return literal.datatype?.value || null;
}

/**
 * Extrae el idioma de un literal RDF
 */
export function getLiteralLanguage(literal: N3.Literal): string | null {
  return literal.language || null;
}

/**
 * Convierte un término RDF a string para almacenamiento
 */
export function termToString(term: N3.Term): string {
  if (isNamedNode(term)) {
    return term.value;
  } else if (isLiteral(term)) {
    return term.value;
  } else if (isBlankNode(term)) {
    return term.value;
  }
  return term.value;
}

/**
 * Extrae todos los prefijos/namespaces de un conjunto de triplas
 */
export function extractPrefixes(quads: N3.Quad[]): Map<string, string> {
  const namespaces = new Map<string, string>();
  const namespaceCounts = new Map<string, number>();

  // Contar ocurrencias de cada namespace
  quads.forEach(quad => {
    [quad.subject, quad.predicate, quad.object].forEach(term => {
      if (isNamedNode(term)) {
        const ns = extractNamespace(term.value);
        namespaceCounts.set(ns, (namespaceCounts.get(ns) || 0) + 1);
      }
    });
  });

  // Generar prefijos automáticos para los namespaces más comunes
  const commonPrefixes: Record<string, string> = {
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
    'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
    'http://www.w3.org/2002/07/owl#': 'owl',
    'http://www.w3.org/2001/XMLSchema#': 'xsd',
    'http://www.w3.org/XML/1998/namespace': 'xml',
  };

  // Asignar prefijos conocidos
  namespaceCounts.forEach((count, ns) => {
    if (commonPrefixes[ns]) {
      namespaces.set(commonPrefixes[ns], ns);
    }
  });

  // Asignar prefijos automáticos a otros namespaces
  let prefixCounter = 1;
  namespaceCounts.forEach((count, ns) => {
    if (!Array.from(namespaces.values()).includes(ns)) {
      namespaces.set(`ns${prefixCounter}`, ns);
      prefixCounter++;
    }
  });

  return namespaces;
}

/**
 * Compacta una IRI usando prefijos conocidos
 */
export function compactIRI(iri: string, prefixes: Map<string, string>): string {
  for (const [prefix, namespace] of prefixes.entries()) {
    if (iri.startsWith(namespace)) {
      return `${prefix}:${iri.substring(namespace.length)}`;
    }
  }
  return iri;
}
