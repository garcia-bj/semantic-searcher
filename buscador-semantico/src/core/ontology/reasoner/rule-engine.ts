import {
    InferenceRule,
    InferenceRuleType,
    InferredTriple,
    TripleData,
    InferenceContext,
} from './inference.types';

/**
 * Constantes RDF/RDFS/OWL
 */
const RDF = {
    TYPE: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type',
};

const RDFS = {
    SUBCLASS_OF: 'http://www.w3.org/2000/01/rdf-schema#subClassOf',
    SUBPROPERTY_OF: 'http://www.w3.org/2000/01/rdf-schema#subPropertyOf',
    DOMAIN: 'http://www.w3.org/2000/01/rdf-schema#domain',
    RANGE: 'http://www.w3.org/2000/01/rdf-schema#range',
};

const OWL = {
    CLASS: 'http://www.w3.org/2002/07/owl#Class',
    EQUIVALENT_CLASS: 'http://www.w3.org/2002/07/owl#equivalentClass',
    SAME_AS: 'http://www.w3.org/2002/07/owl#sameAs',
    INVERSE_OF: 'http://www.w3.org/2002/07/owl#inverseOf',
    TRANSITIVE_PROPERTY: 'http://www.w3.org/2002/07/owl#TransitiveProperty',
    SYMMETRIC_PROPERTY: 'http://www.w3.org/2002/07/owl#SymmetricProperty',
    FUNCTIONAL_PROPERTY: 'http://www.w3.org/2002/07/owl#FunctionalProperty',
    INVERSE_FUNCTIONAL_PROPERTY: 'http://www.w3.org/2002/07/owl#InverseFunctionalProperty',
};

/**
 * Regla: rdfs:subClassOf - Transitividad
 * Si A subClassOf B y B subClassOf C, entonces A subClassOf C
 */
export const rdfsSubClassOfTransitivity: InferenceRule = {
    name: InferenceRuleType.RDFS_SUBCLASS_OF,
    description: 'Transitividad de rdfs:subClassOf',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];
        const subClassMap = new Map<string, Set<string>>();

        // Construir mapa de subclases
        triples
            .filter(t => t.predicate === RDFS.SUBCLASS_OF && !t.isLiteral)
            .forEach(t => {
                if (!subClassMap.has(t.subject)) {
                    subClassMap.set(t.subject, new Set());
                }
                subClassMap.get(t.subject)!.add(t.object);
            });

        // Aplicar transitividad
        subClassMap.forEach((superClasses, subClass) => {
            const visited = new Set<string>();
            const queue = Array.from(superClasses);

            while (queue.length > 0) {
                const current = queue.shift()!;
                if (visited.has(current)) continue;
                visited.add(current);

                // Si current tiene superclases, agregar inferencia
                const currentSuperClasses = subClassMap.get(current);
                if (currentSuperClasses) {
                    currentSuperClasses.forEach(superClass => {
                        if (!superClasses.has(superClass)) {
                            inferred.push({
                                subject: subClass,
                                predicate: RDFS.SUBCLASS_OF,
                                object: superClass,
                                isLiteral: false,
                                graph: context.graph,
                                inferredBy: InferenceRuleType.RDFS_SUBCLASS_OF,
                            });
                            queue.push(superClass);
                        }
                    });
                }
            }
        });

        return inferred;
    },
};

/**
 * Regla: rdfs:subClassOf - Inferencia de tipos
 * Si x rdf:type A y A rdfs:subClassOf B, entonces x rdf:type B
 */
export const rdfsSubClassOfTypeInference: InferenceRule = {
    name: InferenceRuleType.RDFS_SUBCLASS_OF,
    description: 'Inferencia de tipos por jerarquía de clases',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Obtener todas las relaciones de subclases (incluyendo transitivas)
        const subClassMap = new Map<string, Set<string>>();
        triples
            .filter(t => t.predicate === RDFS.SUBCLASS_OF && !t.isLiteral)
            .forEach(t => {
                if (!subClassMap.has(t.subject)) {
                    subClassMap.set(t.subject, new Set());
                }
                subClassMap.get(t.subject)!.add(t.object);
            });

        // Para cada instancia, inferir tipos de superclases
        triples
            .filter(t => t.predicate === RDF.TYPE && !t.isLiteral)
            .forEach(instanceTriple => {
                const instance = instanceTriple.subject;
                const directClass = instanceTriple.object;

                const superClasses = subClassMap.get(directClass);
                if (superClasses) {
                    superClasses.forEach(superClass => {
                        inferred.push({
                            subject: instance,
                            predicate: RDF.TYPE,
                            object: superClass,
                            isLiteral: false,
                            graph: context.graph,
                            inferredBy: InferenceRuleType.RDFS_SUBCLASS_OF,
                        });
                    });
                }
            });

        return inferred;
    },
};

/**
 * Regla: rdfs:domain
 * Si P rdfs:domain C y x P y, entonces x rdf:type C
 */
export const rdfsDomain: InferenceRule = {
    name: InferenceRuleType.RDFS_DOMAIN,
    description: 'Inferencia de tipos por dominio de propiedades',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Obtener dominios de propiedades
        const domainMap = new Map<string, string[]>();
        triples
            .filter(t => t.predicate === RDFS.DOMAIN && !t.isLiteral)
            .forEach(t => {
                if (!domainMap.has(t.subject)) {
                    domainMap.set(t.subject, []);
                }
                domainMap.get(t.subject)!.push(t.object);
            });

        // Para cada uso de propiedad, inferir tipo del sujeto
        triples.forEach(triple => {
            const domains = domainMap.get(triple.predicate);
            if (domains) {
                domains.forEach(domain => {
                    inferred.push({
                        subject: triple.subject,
                        predicate: RDF.TYPE,
                        object: domain,
                        isLiteral: false,
                        graph: context.graph,
                        inferredBy: InferenceRuleType.RDFS_DOMAIN,
                    });
                });
            }
        });

        return inferred;
    },
};

/**
 * Regla: rdfs:range
 * Si P rdfs:range C y x P y, entonces y rdf:type C
 */
export const rdfsRange: InferenceRule = {
    name: InferenceRuleType.RDFS_RANGE,
    description: 'Inferencia de tipos por rango de propiedades',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Obtener rangos de propiedades
        const rangeMap = new Map<string, string[]>();
        triples
            .filter(t => t.predicate === RDFS.RANGE && !t.isLiteral)
            .forEach(t => {
                if (!rangeMap.has(t.subject)) {
                    rangeMap.set(t.subject, []);
                }
                rangeMap.get(t.subject)!.push(t.object);
            });

        // Para cada uso de propiedad, inferir tipo del objeto (si no es literal)
        triples
            .filter(t => !t.isLiteral)
            .forEach(triple => {
                const ranges = rangeMap.get(triple.predicate);
                if (ranges) {
                    ranges.forEach(range => {
                        inferred.push({
                            subject: triple.object,
                            predicate: RDF.TYPE,
                            object: range,
                            isLiteral: false,
                            graph: context.graph,
                            inferredBy: InferenceRuleType.RDFS_RANGE,
                        });
                    });
                }
            });

        return inferred;
    },
};

/**
 * Regla: owl:equivalentClass
 * Si A owl:equivalentClass B y x rdf:type A, entonces x rdf:type B
 */
export const owlEquivalentClass: InferenceRule = {
    name: InferenceRuleType.OWL_EQUIVALENT_CLASS,
    description: 'Inferencia por clases equivalentes',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Obtener clases equivalentes
        const equivalentMap = new Map<string, Set<string>>();
        triples
            .filter(t => t.predicate === OWL.EQUIVALENT_CLASS && !t.isLiteral)
            .forEach(t => {
                if (!equivalentMap.has(t.subject)) {
                    equivalentMap.set(t.subject, new Set());
                }
                if (!equivalentMap.has(t.object)) {
                    equivalentMap.set(t.object, new Set());
                }
                equivalentMap.get(t.subject)!.add(t.object);
                equivalentMap.get(t.object)!.add(t.subject); // Simétrica
            });

        // Para cada instancia, inferir tipos equivalentes
        triples
            .filter(t => t.predicate === RDF.TYPE && !t.isLiteral)
            .forEach(instanceTriple => {
                const instance = instanceTriple.subject;
                const classType = instanceTriple.object;

                const equivalents = equivalentMap.get(classType);
                if (equivalents) {
                    equivalents.forEach(equivClass => {
                        inferred.push({
                            subject: instance,
                            predicate: RDF.TYPE,
                            object: equivClass,
                            isLiteral: false,
                            graph: context.graph,
                            inferredBy: InferenceRuleType.OWL_EQUIVALENT_CLASS,
                        });
                    });
                }
            });

        return inferred;
    },
};

/**
 * Regla: owl:sameAs
 * Si x owl:sameAs y, entonces todas las propiedades de x también aplican a y
 */
export const owlSameAs: InferenceRule = {
    name: InferenceRuleType.OWL_SAME_AS,
    description: 'Inferencia por individuos equivalentes',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Obtener individuos equivalentes
        const sameAsMap = new Map<string, Set<string>>();
        triples
            .filter(t => t.predicate === OWL.SAME_AS && !t.isLiteral)
            .forEach(t => {
                if (!sameAsMap.has(t.subject)) {
                    sameAsMap.set(t.subject, new Set());
                }
                if (!sameAsMap.has(t.object)) {
                    sameAsMap.set(t.object, new Set());
                }
                sameAsMap.get(t.subject)!.add(t.object);
                sameAsMap.get(t.object)!.add(t.subject); // Simétrica
            });

        // Para cada tripla, duplicar para individuos equivalentes
        triples.forEach(triple => {
            // Si el sujeto tiene equivalentes
            const subjectEquivs = sameAsMap.get(triple.subject);
            if (subjectEquivs) {
                subjectEquivs.forEach(equiv => {
                    inferred.push({
                        subject: equiv,
                        predicate: triple.predicate,
                        object: triple.object,
                        isLiteral: triple.isLiteral,
                        datatype: triple.datatype,
                        lang: triple.lang,
                        graph: context.graph,
                        inferredBy: InferenceRuleType.OWL_SAME_AS,
                    });
                });
            }

            // Si el objeto tiene equivalentes (y no es literal)
            if (!triple.isLiteral) {
                const objectEquivs = sameAsMap.get(triple.object);
                if (objectEquivs) {
                    objectEquivs.forEach(equiv => {
                        inferred.push({
                            subject: triple.subject,
                            predicate: triple.predicate,
                            object: equiv,
                            isLiteral: false,
                            graph: context.graph,
                            inferredBy: InferenceRuleType.OWL_SAME_AS,
                        });
                    });
                }
            }
        });

        return inferred;
    },
};

/**
 * Regla: owl:inverseOf
 * Si P owl:inverseOf Q y x P y, entonces y Q x
 */
export const owlInverseOf: InferenceRule = {
    name: InferenceRuleType.OWL_INVERSE_OF,
    description: 'Inferencia por propiedades inversas',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Obtener propiedades inversas
        const inverseMap = new Map<string, string[]>();
        triples
            .filter(t => t.predicate === OWL.INVERSE_OF && !t.isLiteral)
            .forEach(t => {
                if (!inverseMap.has(t.subject)) {
                    inverseMap.set(t.subject, []);
                }
                if (!inverseMap.has(t.object)) {
                    inverseMap.set(t.object, []);
                }
                inverseMap.get(t.subject)!.push(t.object);
                inverseMap.get(t.object)!.push(t.subject); // Bidireccional
            });

        // Para cada tripla, generar inversas
        triples
            .filter(t => !t.isLiteral)
            .forEach(triple => {
                const inverses = inverseMap.get(triple.predicate);
                if (inverses) {
                    inverses.forEach(inverseProp => {
                        inferred.push({
                            subject: triple.object,
                            predicate: inverseProp,
                            object: triple.subject,
                            isLiteral: false,
                            graph: context.graph,
                            inferredBy: InferenceRuleType.OWL_INVERSE_OF,
                        });
                    });
                }
            });

        return inferred;
    },
};

/**
 * Regla: owl:TransitiveProperty
 * Si P es transitiva y x P y y y P z, entonces x P z
 */
export const owlTransitiveProperty: InferenceRule = {
    name: InferenceRuleType.OWL_TRANSITIVE_PROPERTY,
    description: 'Inferencia por propiedades transitivas',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Identificar propiedades transitivas
        const transitiveProps = new Set<string>();
        triples
            .filter(t => t.predicate === RDF.TYPE && t.object === OWL.TRANSITIVE_PROPERTY)
            .forEach(t => transitiveProps.add(t.subject));

        // Para cada propiedad transitiva, aplicar transitividad
        transitiveProps.forEach(prop => {
            const propTriples = triples.filter(t => t.predicate === prop && !t.isLiteral);

            // Construir grafo de relaciones
            const graph = new Map<string, Set<string>>();
            propTriples.forEach(t => {
                if (!graph.has(t.subject)) {
                    graph.set(t.subject, new Set());
                }
                graph.get(t.subject)!.add(t.object);
            });

            // Aplicar transitividad
            graph.forEach((targets, source) => {
                const visited = new Set<string>();
                const queue = Array.from(targets);

                while (queue.length > 0) {
                    const current = queue.shift()!;
                    if (visited.has(current)) continue;
                    visited.add(current);

                    const currentTargets = graph.get(current);
                    if (currentTargets) {
                        currentTargets.forEach(target => {
                            if (!targets.has(target)) {
                                inferred.push({
                                    subject: source,
                                    predicate: prop,
                                    object: target,
                                    isLiteral: false,
                                    graph: context.graph,
                                    inferredBy: InferenceRuleType.OWL_TRANSITIVE_PROPERTY,
                                });
                                queue.push(target);
                            }
                        });
                    }
                }
            });
        });

        return inferred;
    },
};

/**
 * Regla: owl:SymmetricProperty
 * Si P es simétrica y x P y, entonces y P x
 */
export const owlSymmetricProperty: InferenceRule = {
    name: InferenceRuleType.OWL_SYMMETRIC_PROPERTY,
    description: 'Inferencia por propiedades simétricas',
    apply: (triples: TripleData[], context: InferenceContext): InferredTriple[] => {
        const inferred: InferredTriple[] = [];

        // Identificar propiedades simétricas
        const symmetricProps = new Set<string>();
        triples
            .filter(t => t.predicate === RDF.TYPE && t.object === OWL.SYMMETRIC_PROPERTY)
            .forEach(t => symmetricProps.add(t.subject));

        // Para cada uso de propiedad simétrica, generar inversa
        triples
            .filter(t => symmetricProps.has(t.predicate) && !t.isLiteral)
            .forEach(triple => {
                inferred.push({
                    subject: triple.object,
                    predicate: triple.predicate,
                    object: triple.subject,
                    isLiteral: false,
                    graph: context.graph,
                    inferredBy: InferenceRuleType.OWL_SYMMETRIC_PROPERTY,
                });
            });

        return inferred;
    },
};

/**
 * Registro de todas las reglas disponibles
 */
export const ALL_RULES: InferenceRule[] = [
    rdfsSubClassOfTransitivity,
    rdfsSubClassOfTypeInference,
    rdfsDomain,
    rdfsRange,
    owlEquivalentClass,
    owlSameAs,
    owlInverseOf,
    owlTransitiveProperty,
    owlSymmetricProperty,
];

/**
 * Obtiene las reglas por tipo
 */
export function getRulesByType(types: InferenceRuleType[]): InferenceRule[] {
    return ALL_RULES.filter(rule => types.includes(rule.name as InferenceRuleType));
}
