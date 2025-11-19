import { ReasoningLevel, InferenceRuleType } from '../core/ontology/reasoner/inference.types';

export const reasonerConfig = {
    // Nivel de razonamiento por defecto
    defaultReasoningLevel: ReasoningLevel.OWL_LITE,

    // Habilitar razonamiento automático al subir ontologías
    autoReason: true,

    // Máximo número de iteraciones para evitar ciclos infinitos
    maxIterations: 100,

    // Timeout para razonamiento (en milisegundos)
    reasoningTimeout: 120000, // 2 minutos

    // Límite de triplas inferidas por documento
    maxInferredTriplesPerDocument: 500000, // 500k triplas inferidas

    // Reglas habilitadas por nivel de razonamiento
    rulesByLevel: {
        [ReasoningLevel.NONE]: [],

        [ReasoningLevel.RDFS]: [
            InferenceRuleType.RDFS_SUBCLASS_OF,
            InferenceRuleType.RDFS_SUBPROPERTY_OF,
            InferenceRuleType.RDFS_DOMAIN,
            InferenceRuleType.RDFS_RANGE,
        ],

        [ReasoningLevel.OWL_LITE]: [
            // RDFS
            InferenceRuleType.RDFS_SUBCLASS_OF,
            InferenceRuleType.RDFS_SUBPROPERTY_OF,
            InferenceRuleType.RDFS_DOMAIN,
            InferenceRuleType.RDFS_RANGE,
            // OWL Lite
            InferenceRuleType.OWL_EQUIVALENT_CLASS,
            InferenceRuleType.OWL_SAME_AS,
            InferenceRuleType.OWL_INVERSE_OF,
            InferenceRuleType.OWL_TRANSITIVE_PROPERTY,
            InferenceRuleType.OWL_SYMMETRIC_PROPERTY,
        ],

        [ReasoningLevel.OWL_DL]: [
            // Todas las reglas
            InferenceRuleType.RDFS_SUBCLASS_OF,
            InferenceRuleType.RDFS_SUBPROPERTY_OF,
            InferenceRuleType.RDFS_DOMAIN,
            InferenceRuleType.RDFS_RANGE,
            InferenceRuleType.OWL_EQUIVALENT_CLASS,
            InferenceRuleType.OWL_SAME_AS,
            InferenceRuleType.OWL_INVERSE_OF,
            InferenceRuleType.OWL_TRANSITIVE_PROPERTY,
            InferenceRuleType.OWL_SYMMETRIC_PROPERTY,
            InferenceRuleType.OWL_FUNCTIONAL_PROPERTY,
            InferenceRuleType.OWL_INVERSE_FUNCTIONAL_PROPERTY,
        ],
    },

    // Detectar y reportar inconsistencias
    checkConsistency: true,

    // Cachear resultados de inferencias
    enableCache: true,

    // Aplicar razonamiento de forma incremental
    incrementalReasoning: true,
};
