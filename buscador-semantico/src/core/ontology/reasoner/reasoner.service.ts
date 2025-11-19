import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
    InferenceContext,
    InferenceResult,
    InferredTriple,
    TripleData,
    ReasoningLevel,
    ReasoningStats,
} from './inference.types';
import { reasonerConfig } from '../../../config/reasoner.config';
import { ALL_RULES, getRulesByType } from './rule-engine';

@Injectable()
export class ReasonerService {
    private readonly logger = new Logger(ReasonerService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Aplica razonamiento a un documento OWL
     */
    async applyReasoning(
        documentId: number,
        level: ReasoningLevel = reasonerConfig.defaultReasoningLevel,
    ): Promise<ReasoningStats> {
        const startTime = Date.now();
        this.logger.log(`Starting reasoning for document ${documentId} with level ${level}`);

        try {
            // Cargar triplas explícitas del documento
            const explicitTriples = await this.loadExplicitTriples(documentId);

            if (explicitTriples.length === 0) {
                this.logger.warn(`No explicit triples found for document ${documentId}`);
                return this.createEmptyStats(startTime);
            }

            // Obtener graph/IRI de la ontología
            const graph = explicitTriples[0]?.graph || undefined;

            // Configurar contexto de inferencia
            const context: InferenceContext = {
                documentId,
                graph,
                maxIterations: reasonerConfig.maxIterations,
                enabledRules: reasonerConfig.rulesByLevel[level],
            };

            // Aplicar reglas de inferencia
            const result = await this.applyInferenceRules(explicitTriples, context);

            // Almacenar triplas inferidas
            if (result.inferredTriples.length > 0) {
                await this.storeInferredTriples(documentId, result.inferredTriples);
            }

            // Generar estadísticas
            const stats = this.generateStats(
                explicitTriples.length,
                result.inferredTriples.length,
                result,
                startTime,
            );

            this.logger.log(
                `Reasoning completed: ${result.inferredTriples.length} triples inferred in ${result.iterations} iterations`,
            );

            return stats;
        } catch (error) {
            this.logger.error(`Reasoning failed for document ${documentId}:`, error);
            throw error;
        }
    }

    /**
     * Carga triplas explícitas de un documento
     */
    private async loadExplicitTriples(documentId: number): Promise<TripleData[]> {
        const triples = await this.prisma.triple.findMany({
            where: {
                documentId,
                isInferred: false, // Solo triplas explícitas
            },
        });

        return triples.map(t => ({
            id: t.id,
            subject: t.subject,
            predicate: t.predicate,
            object: t.object,
            isLiteral: t.isLiteral,
            datatype: t.datatype || undefined,
            lang: t.lang || undefined,
            graph: t.graph || undefined,
            isInferred: false,
        }));
    }

    /**
     * Aplica reglas de inferencia iterativamente
     */
    private async applyInferenceRules(
        explicitTriples: TripleData[],
        context: InferenceContext,
    ): Promise<InferenceResult> {
        const allInferred: InferredTriple[] = [];
        const rulesApplied = new Set<string>();
        const inconsistencies: string[] = [];

        // Obtener reglas habilitadas
        const rules = context.enabledRules
            ? getRulesByType(context.enabledRules)
            : ALL_RULES;

        let currentTriples = [...explicitTriples];
        let iteration = 0;
        let newInferencesCount = 0;

        do {
            iteration++;
            newInferencesCount = 0;

            // Aplicar cada regla
            for (const rule of rules) {
                try {
                    const inferred = rule.apply(currentTriples, context);

                    // Filtrar duplicados
                    const uniqueInferred = this.filterDuplicates(inferred, currentTriples, allInferred);

                    if (uniqueInferred.length > 0) {
                        rulesApplied.add(rule.name);
                        allInferred.push(...uniqueInferred);

                        // Agregar inferencias a las triplas actuales para la siguiente iteración
                        currentTriples.push(...uniqueInferred.map(inf => ({
                            subject: inf.subject,
                            predicate: inf.predicate,
                            object: inf.object,
                            isLiteral: inf.isLiteral,
                            datatype: inf.datatype,
                            lang: inf.lang,
                            graph: inf.graph,
                            isInferred: true,
                            inferredBy: inf.inferredBy,
                        })));

                        newInferencesCount += uniqueInferred.length;
                    }
                } catch (error) {
                    this.logger.error(`Error applying rule ${rule.name}:`, error);
                }
            }

            // Verificar límites
            if (allInferred.length > reasonerConfig.maxInferredTriplesPerDocument) {
                this.logger.warn(
                    `Inference limit reached (${reasonerConfig.maxInferredTriplesPerDocument}), stopping`,
                );
                break;
            }

            if (iteration >= (context.maxIterations || reasonerConfig.maxIterations)) {
                this.logger.warn(`Max iterations reached (${iteration}), stopping`);
                break;
            }

        } while (newInferencesCount > 0);

        return {
            inferredTriples: allInferred,
            iterations: iteration,
            rulesApplied: Array.from(rulesApplied),
            inconsistencies,
        };
    }

    /**
     * Filtra triplas duplicadas
     */
    private filterDuplicates(
        newInferred: InferredTriple[],
        existingTriples: TripleData[],
        previousInferred: InferredTriple[],
    ): InferredTriple[] {
        const existingSet = new Set(
            existingTriples.map(t => `${t.subject}|${t.predicate}|${t.object}`),
        );
        const previousSet = new Set(
            previousInferred.map(t => `${t.subject}|${t.predicate}|${t.object}`),
        );

        return newInferred.filter(inf => {
            const key = `${inf.subject}|${inf.predicate}|${inf.object}`;
            return !existingSet.has(key) && !previousSet.has(key);
        });
    }

    /**
     * Almacena triplas inferidas en la base de datos
     */
    private async storeInferredTriples(
        documentId: number,
        inferredTriples: InferredTriple[],
    ): Promise<void> {
        // Eliminar inferencias previas para este documento
        await this.prisma.triple.deleteMany({
            where: {
                documentId,
                isInferred: true,
            },
        });

        // Insertar nuevas inferencias en lotes
        const batchSize = 1000;
        for (let i = 0; i < inferredTriples.length; i += batchSize) {
            const batch = inferredTriples.slice(i, i + batchSize);

            await this.prisma.triple.createMany({
                data: batch.map(inf => ({
                    documentId,
                    graph: inf.graph || null,
                    subject: inf.subject,
                    predicate: inf.predicate,
                    object: inf.object,
                    isLiteral: inf.isLiteral,
                    datatype: inf.datatype || null,
                    lang: inf.lang || null,
                    isInferred: true,
                    inferredBy: inf.inferredBy,
                })),
            });
        }

        this.logger.log(`Stored ${inferredTriples.length} inferred triples for document ${documentId}`);
    }

    /**
     * Genera estadísticas de razonamiento
     */
    private generateStats(
        explicitCount: number,
        inferredCount: number,
        result: InferenceResult,
        startTime: number,
    ): ReasoningStats {
        const inferencesByRule: Record<string, number> = {};

        result.inferredTriples.forEach(inf => {
            const rule = inf.inferredBy;
            inferencesByRule[rule] = (inferencesByRule[rule] || 0) + 1;
        });

        return {
            totalExplicitTriples: explicitCount,
            totalInferredTriples: inferredCount,
            inferencesByRule,
            processingTimeMs: Date.now() - startTime,
            iterations: result.iterations,
        };
    }

    /**
     * Crea estadísticas vacías
     */
    private createEmptyStats(startTime: number): ReasoningStats {
        return {
            totalExplicitTriples: 0,
            totalInferredTriples: 0,
            inferencesByRule: {},
            processingTimeMs: Date.now() - startTime,
            iterations: 0,
        };
    }

    /**
     * Obtiene estadísticas de razonamiento para un documento
     */
    async getReasoningStats(documentId: number): Promise<ReasoningStats> {
        const explicitCount = await this.prisma.triple.count({
            where: { documentId, isInferred: false },
        });

        const inferredCount = await this.prisma.triple.count({
            where: { documentId, isInferred: true },
        });

        const inferredTriples = await this.prisma.triple.findMany({
            where: { documentId, isInferred: true },
            select: { inferredBy: true },
        });

        const inferencesByRule: Record<string, number> = {};
        inferredTriples.forEach(t => {
            if (t.inferredBy) {
                inferencesByRule[t.inferredBy] = (inferencesByRule[t.inferredBy] || 0) + 1;
            }
        });

        return {
            totalExplicitTriples: explicitCount,
            totalInferredTriples: inferredCount,
            inferencesByRule,
            processingTimeMs: 0,
            iterations: 0,
        };
    }

    /**
     * Elimina todas las inferencias de un documento
     */
    async clearInferences(documentId: number): Promise<void> {
        await this.prisma.triple.deleteMany({
            where: {
                documentId,
                isInferred: true,
            },
        });

        this.logger.log(`Cleared all inferences for document ${documentId}`);
    }
}
