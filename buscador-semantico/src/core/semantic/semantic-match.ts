import { distance as levenshteinDistance } from 'fastest-levenshtein';
import { compareTwoStrings } from 'string-similarity';

/**
 * Resultado de comparación semántica
 */
export interface SemanticMatchResult {
    score: number;           // Score total (0-1)
    hierarchyScore: number;  // Score de jerarquía
    propertyScore: number;   // Score de propiedades
    labelScore: number;      // Score de etiquetas
    details: string;         // Explicación del match
}

/**
 * Información de un concepto para comparación
 */
export interface ConceptInfo {
    iri: string;
    label?: string;
    type: 'Class' | 'Property' | 'Individual';
    superClasses?: string[];
    subClasses?: string[];
    properties?: string[];
    domain?: string;
    range?: string;
    instances?: string[];
}

/**
 * Wu-Palmer Similarity - Similitud basada en jerarquía de clases
 * Mide la distancia semántica entre dos conceptos en una jerarquía
 * 
 * Fórmula: 2 * depth(LCA) / (depth(c1) + depth(c2))
 * donde LCA = Lowest Common Ancestor
 */
export function wuPalmerSimilarity(
    concept1: ConceptInfo,
    concept2: ConceptInfo,
    classHierarchy: Map<string, ConceptInfo>,
): number {
    // Si son el mismo concepto
    if (concept1.iri === concept2.iri) {
        return 1.0;
    }

    // Solo aplica a clases
    if (concept1.type !== 'Class' || concept2.type !== 'Class') {
        return 0.0;
    }

    // Encontrar el ancestro común más cercano (LCA)
    const ancestors1 = getAncestors(concept1.iri, classHierarchy);
    const ancestors2 = getAncestors(concept2.iri, classHierarchy);

    // Encontrar ancestros comunes
    const commonAncestors = ancestors1.filter(a => ancestors2.includes(a));

    if (commonAncestors.length === 0) {
        return 0.0; // No hay ancestro común
    }

    // El LCA es el ancestro común más profundo (más específico)
    let lca = commonAncestors[0];
    let maxDepth = getDepth(lca, classHierarchy);

    for (const ancestor of commonAncestors) {
        const depth = getDepth(ancestor, classHierarchy);
        if (depth > maxDepth) {
            maxDepth = depth;
            lca = ancestor;
        }
    }

    const depth1 = getDepth(concept1.iri, classHierarchy);
    const depth2 = getDepth(concept2.iri, classHierarchy);
    const lcaDepth = getDepth(lca, classHierarchy);

    // Fórmula Wu-Palmer
    const similarity = (2 * lcaDepth) / (depth1 + depth2);

    return Math.min(1.0, Math.max(0.0, similarity));
}

/**
 * Obtiene todos los ancestros de un concepto
 */
function getAncestors(iri: string, hierarchy: Map<string, ConceptInfo>): string[] {
    const ancestors: string[] = [iri];
    const concept = hierarchy.get(iri);

    if (!concept || !concept.superClasses) {
        return ancestors;
    }

    for (const superClass of concept.superClasses) {
        const superAncestors = getAncestors(superClass, hierarchy);
        ancestors.push(...superAncestors);
    }

    return [...new Set(ancestors)]; // Eliminar duplicados
}

/**
 * Calcula la profundidad de un concepto en la jerarquía
 */
function getDepth(iri: string, hierarchy: Map<string, ConceptInfo>): number {
    const concept = hierarchy.get(iri);

    if (!concept || !concept.superClasses || concept.superClasses.length === 0) {
        return 1; // Raíz
    }

    let maxDepth = 0;
    for (const superClass of concept.superClasses) {
        const depth = getDepth(superClass, hierarchy);
        maxDepth = Math.max(maxDepth, depth);
    }

    return maxDepth + 1;
}

/**
 * Jaccard Similarity - Similitud basada en propiedades compartidas
 * Mide cuántas propiedades/características comparten dos conceptos
 * 
 * Fórmula: |A ∩ B| / |A ∪ B|
 */
export function jaccardSimilarity(
    concept1: ConceptInfo,
    concept2: ConceptInfo,
): number {
    // Recolectar características de cada concepto
    const features1 = new Set<string>();
    const features2 = new Set<string>();

    // Agregar propiedades
    if (concept1.properties) {
        concept1.properties.forEach(p => features1.add(`prop:${p}`));
    }
    if (concept2.properties) {
        concept2.properties.forEach(p => features2.add(`prop:${p}`));
    }

    // Agregar superclases
    if (concept1.superClasses) {
        concept1.superClasses.forEach(c => features1.add(`super:${c}`));
    }
    if (concept2.superClasses) {
        concept2.superClasses.forEach(c => features2.add(`super:${c}`));
    }

    // Agregar dominio/rango para propiedades
    if (concept1.domain) features1.add(`domain:${concept1.domain}`);
    if (concept1.range) features1.add(`range:${concept1.range}`);
    if (concept2.domain) features2.add(`domain:${concept2.domain}`);
    if (concept2.range) features2.add(`range:${concept2.range}`);

    // Si ambos conjuntos están vacíos
    if (features1.size === 0 && features2.size === 0) {
        return 0.0;
    }

    // Calcular intersección
    const intersection = new Set(
        [...features1].filter(f => features2.has(f))
    );

    // Calcular unión
    const union = new Set([...features1, ...features2]);

    // Jaccard = |intersección| / |unión|
    return intersection.size / union.size;
}

/**
 * String Similarity - Similitud basada en etiquetas/nombres
 * Combina múltiples métricas de similitud de strings
 */
export function stringSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0.0;

    // Normalizar strings
    const norm1 = normalizeString(str1);
    const norm2 = normalizeString(str2);

    // Exacto después de normalización
    if (norm1 === norm2) return 1.0;

    // Usar Dice's Coefficient (de string-similarity)
    const diceScore = compareTwoStrings(norm1, norm2);

    // Levenshtein normalizado
    const maxLen = Math.max(norm1.length, norm2.length);
    const levDistance = levenshteinDistance(norm1, norm2);
    const levScore = 1 - (levDistance / maxLen);

    // Substring matching
    const substringScore = substringMatch(norm1, norm2);

    // Combinar métricas (promedio ponderado)
    return (diceScore * 0.4) + (levScore * 0.3) + (substringScore * 0.3);
}

/**
 * Normaliza un string para comparación
 */
function normalizeString(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD') // Descomponer caracteres acentuados
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9]/g, '') // Solo alfanuméricos
        .trim();
}

/**
 * Verifica si un string contiene al otro
 */
function substringMatch(str1: string, str2: string): number {
    if (str1.includes(str2) || str2.includes(str1)) {
        const shorter = Math.min(str1.length, str2.length);
        const longer = Math.max(str1.length, str2.length);
        return shorter / longer;
    }
    return 0.0;
}

/**
 * Calcula similitud semántica completa entre dos conceptos
 * Combina múltiples métricas con pesos configurables
 */
export function calculateSemanticSimilarity(
    concept1: ConceptInfo,
    concept2: ConceptInfo,
    classHierarchy: Map<string, ConceptInfo>,
    weights: { label: number; hierarchy: number; properties: number } = {
        label: 0.4,
        hierarchy: 0.3,
        properties: 0.3,
    },
): SemanticMatchResult {
    // Similitud de etiquetas
    const labelScore = stringSimilarity(
        concept1.label || concept1.iri,
        concept2.label || concept2.iri,
    );

    // Similitud jerárquica (solo para clases)
    const hierarchyScore = wuPalmerSimilarity(concept1, concept2, classHierarchy);

    // Similitud de propiedades
    const propertyScore = jaccardSimilarity(concept1, concept2);

    // Score total ponderado
    const totalScore =
        labelScore * weights.label +
        hierarchyScore * weights.hierarchy +
        propertyScore * weights.properties;

    // Generar explicación
    let details = '';
    if (labelScore > 0.7) details += 'Etiquetas muy similares. ';
    if (hierarchyScore > 0.7) details += 'Cercanos en jerarquía. ';
    if (propertyScore > 0.5) details += 'Comparten propiedades. ';
    if (details === '') details = 'Similitud baja.';

    return {
        score: totalScore,
        hierarchyScore,
        propertyScore,
        labelScore,
        details: details.trim(),
    };
}

/**
 * Encuentra los N conceptos más similares a un concepto dado
 */
export function findSimilarConcepts(
    targetConcept: ConceptInfo,
    allConcepts: ConceptInfo[],
    classHierarchy: Map<string, ConceptInfo>,
    topN: number = 10,
    minScore: number = 0.3,
): Array<{ concept: ConceptInfo; match: SemanticMatchResult }> {
    const results: Array<{ concept: ConceptInfo; match: SemanticMatchResult }> = [];

    for (const concept of allConcepts) {
        // No comparar consigo mismo
        if (concept.iri === targetConcept.iri) continue;

        const match = calculateSemanticSimilarity(
            targetConcept,
            concept,
            classHierarchy,
        );

        if (match.score >= minScore) {
            results.push({ concept, match });
        }
    }

    // Ordenar por score descendente
    results.sort((a, b) => b.match.score - a.match.score);

    // Retornar top N
    return results.slice(0, topN);
}
