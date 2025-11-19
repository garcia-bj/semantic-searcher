import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { owlConfig } from '../../config/owl.config';
import { loadOWLFromBuffer } from '../../core/ontology/parsers/owl-loader';
import { parseOWL } from '../../core/ontology/parsers/owl-parser';
import { OwlInfoDto, OntologyStatsDto, UploadResponseDto } from './dto/owl-info.dto';
import { ReasonerService } from '../../core/ontology/reasoner/reasoner.service';
import { reasonerConfig } from '../../config/reasoner.config';

@Injectable()
export class OwlService {
    constructor(
        private prisma: PrismaService,
        private reasoner: ReasonerService,
    ) {
        // Asegurar que el directorio de uploads existe
        this.ensureUploadDir();
    }

    /**
     * Asegura que el directorio de uploads existe
     */
    private ensureUploadDir(): void {
        if (!fs.existsSync(owlConfig.uploadDir)) {
            fs.mkdirSync(owlConfig.uploadDir, { recursive: true });
        }
    }

    /**
     * Procesa y almacena un archivo OWL subido
     */
    async uploadOWL(
        file: Express.Multer.File,
        description?: string,
    ): Promise<UploadResponseDto> {
        // Validar tamaño del archivo
        if (file.size > owlConfig.maxFileSize) {
            throw new BadRequestException(
                `File size exceeds maximum allowed (${owlConfig.maxFileSize / (1024 * 1024)}MB)`,
            );
        }

        // Validar extensión
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        if (!owlConfig.supportedFormats.includes(ext)) {
            throw new BadRequestException(
                `Unsupported file format. Supported formats: ${owlConfig.supportedFormats.join(', ')}`,
            );
        }

        // Generar nombre único para el archivo
        const timestamp = Date.now();
        const fileName = `${timestamp}-${file.originalname}`;
        const filePath = path.join(owlConfig.uploadDir, fileName);

        try {
            // Guardar archivo físicamente
            fs.writeFileSync(filePath, file.buffer);

            // Crear registro en BD (sin parsear aún)
            const document = await this.prisma.owlDocument.create({
                data: {
                    fileName,
                    originalName: file.originalname,
                    mimeType: file.mimetype,
                    size: BigInt(file.size),
                    uploadedAt: new Date(),
                },
            });

            // Parsear el archivo
            try {
                const loadedFile = await loadOWLFromBuffer(file.buffer, file.originalname);
                const parseResult = await parseOWL(loadedFile);

                // Validar número de triplas
                if (parseResult.triples.length > owlConfig.maxTriplesPerOntology) {
                    throw new BadRequestException(
                        `Ontology exceeds maximum number of triples (${owlConfig.maxTriplesPerOntology})`,
                    );
                }

                // Almacenar triplas en BD
                await this.prisma.triple.createMany({
                    data: parseResult.triples.map(triple => ({
                        documentId: document.id,
                        graph: parseResult.metadata.iri || null,
                        subject: triple.subject,
                        predicate: triple.predicate,
                        object: triple.object,
                        isLiteral: triple.isLiteral,
                        datatype: triple.datatype || null,
                        lang: triple.lang || null,
                    })),
                });

                // Actualizar documento con información de parseo
                const updatedDocument = await this.prisma.owlDocument.update({
                    where: { id: document.id },
                    data: {
                        parsedAt: new Date(),
                        tripleCount: parseResult.triples.length,
                        hasError: false,
                    },
                });

                // Aplicar razonamiento semántico si está habilitado
                let reasoningStats: any = null;
                if (reasonerConfig.autoReason) {
                    try {
                        reasoningStats = await this.reasoner.applyReasoning(
                            document.id,
                            reasonerConfig.defaultReasoningLevel,
                        );
                    } catch (reasonError) {
                        // Log error but don't fail the upload
                        console.error('Reasoning failed:', reasonError);
                    }
                }

                return {
                    document: this.mapToOwlInfoDto(updatedDocument),
                    stats: {
                        totalTriples: parseResult.triples.length,
                        classCount: parseResult.metadata.classes.size,
                        propertyCount: parseResult.metadata.properties.size,
                        individualCount: parseResult.metadata.individuals.size,
                        inferredTriples: reasoningStats?.totalInferredTriples || 0,
                    },
                    message: reasoningStats
                        ? `OWL file uploaded, parsed and reasoned successfully (${reasoningStats.totalInferredTriples} inferences)`
                        : 'OWL file uploaded and parsed successfully',
                };
            } catch (parseError) {
                // Actualizar documento con error
                await this.prisma.owlDocument.update({
                    where: { id: document.id },
                    data: {
                        hasError: true,
                        errorMessage: parseError.message,
                    },
                });

                throw new BadRequestException(`Failed to parse OWL file: ${parseError.message}`);
            }
        } catch (error) {
            // Limpiar archivo si hubo error
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            throw error;
        }
    }

    /**
     * Obtiene información de un documento OWL
     */
    async getOwlDocument(id: number): Promise<OwlInfoDto> {
        const document = await this.prisma.owlDocument.findUnique({
            where: { id },
        });

        if (!document) {
            throw new NotFoundException(`OWL document with ID ${id} not found`);
        }

        return this.mapToOwlInfoDto(document);
    }

    /**
     * Lista todos los documentos OWL
     */
    async listOwlDocuments(): Promise<OwlInfoDto[]> {
        const documents = await this.prisma.owlDocument.findMany({
            orderBy: { uploadedAt: 'desc' },
        });

        return documents.map(doc => this.mapToOwlInfoDto(doc));
    }

    /**
     * Obtiene estadísticas detalladas de una ontología
     */
    async getOntologyStats(id: number): Promise<OntologyStatsDto> {
        const document = await this.prisma.owlDocument.findUnique({
            where: { id },
            include: {
                triples: true,
            },
        });

        if (!document) {
            throw new NotFoundException(`OWL document with ID ${id} not found`);
        }

        // Extraer IRI de la ontología
        const ontologyIRI = document.triples.find(
            t => t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
                t.object === 'http://www.w3.org/2002/07/owl#Ontology'
        )?.subject;

        // Contar clases
        const classes = new Set(
            document.triples
                .filter(t =>
                    t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
                    (t.object === 'http://www.w3.org/2002/07/owl#Class' ||
                        t.object === 'http://www.w3.org/2000/01/rdf-schema#Class')
                )
                .map(t => t.subject)
        );

        // Contar propiedades
        const properties = new Set(
            document.triples
                .filter(t =>
                    t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
                    (t.object === 'http://www.w3.org/2002/07/owl#ObjectProperty' ||
                        t.object === 'http://www.w3.org/2002/07/owl#DatatypeProperty' ||
                        t.object === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#Property')
                )
                .map(t => t.subject)
        );

        // Contar individuos (instancias)
        const individuals = new Set(
            document.triples
                .filter(t =>
                    t.predicate === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type' &&
                    !t.object.startsWith('http://www.w3.org/2002/07/owl#') &&
                    !t.object.startsWith('http://www.w3.org/2000/01/rdf-schema#') &&
                    !t.object.startsWith('http://www.w3.org/1999/02/22-rdf-syntax-ns#')
                )
                .map(t => t.subject)
        );

        // Extraer namespaces
        const namespaces: Record<string, string> = {};
        const namespaceCounts = new Map<string, number>();

        document.triples.forEach(triple => {
            [triple.subject, triple.predicate, triple.object].forEach(term => {
                if (term.startsWith('http://') || term.startsWith('https://')) {
                    const hashIndex = term.lastIndexOf('#');
                    const slashIndex = term.lastIndexOf('/');
                    const splitIndex = hashIndex > slashIndex ? hashIndex : slashIndex;

                    if (splitIndex >= 0) {
                        const ns = term.substring(0, splitIndex + 1);
                        namespaceCounts.set(ns, (namespaceCounts.get(ns) || 0) + 1);
                    }
                }
            });
        });

        // Top namespaces
        const topNamespaces = Array.from(namespaceCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        topNamespaces.forEach(([ns], index) => {
            const commonPrefixes: Record<string, string> = {
                'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
                'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
                'http://www.w3.org/2002/07/owl#': 'owl',
                'http://www.w3.org/2001/XMLSchema#': 'xsd',
            };

            namespaces[commonPrefixes[ns] || `ns${index + 1}`] = ns;
        });

        return {
            id: document.id,
            ontologyIRI,
            totalTriples: document.tripleCount,
            classCount: classes.size,
            propertyCount: properties.size,
            individualCount: individuals.size,
            namespaces,
            topClasses: Array.from(classes).slice(0, 10),
            topProperties: Array.from(properties).slice(0, 10),
        };
    }

    /**
     * Elimina un documento OWL y todas sus triplas
     */
    async deleteOwlDocument(id: number): Promise<void> {
        const document = await this.prisma.owlDocument.findUnique({
            where: { id },
        });

        if (!document) {
            throw new NotFoundException(`OWL document with ID ${id} not found`);
        }

        // Eliminar archivo físico
        const filePath = path.join(owlConfig.uploadDir, document.fileName);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar de BD (las triplas se eliminan en cascada)
        await this.prisma.owlDocument.delete({
            where: { id },
        });
    }

    /**
     * Mapea un documento de Prisma a DTO
     */
    private mapToOwlInfoDto(document: any): OwlInfoDto {
        return {
            id: document.id,
            fileName: document.fileName,
            originalName: document.originalName || '',
            mimeType: document.mimeType || '',
            size: Number(document.size),
            uploadedAt: document.uploadedAt,
            parsedAt: document.parsedAt,
            tripleCount: document.tripleCount,
            hasError: document.hasError,
            errorMessage: document.errorMessage,
        };
    }
}
