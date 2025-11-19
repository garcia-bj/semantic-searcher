import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

export interface LoadedOWLFile {
    content: string;
    format: RDFFormat;
    size: number;
    path: string;
}

export enum RDFFormat {
    RDFXML = 'application/rdf+xml',
    TURTLE = 'text/turtle',
    N3 = 'text/n3',
    NTRIPLES = 'application/n-triples',
    NQUADS = 'application/n-quads',
    TRIG = 'application/trig',
}

/**
 * Detecta el formato RDF basándose en la extensión del archivo
 */
export function detectFormatFromExtension(filename: string): RDFFormat {
    const ext = path.extname(filename).toLowerCase();

    switch (ext) {
        case '.rdf':
        case '.owl':
        case '.xml':
            return RDFFormat.RDFXML;
        case '.ttl':
            return RDFFormat.TURTLE;
        case '.n3':
            return RDFFormat.N3;
        case '.nt':
            return RDFFormat.NTRIPLES;
        case '.nq':
            return RDFFormat.NQUADS;
        case '.trig':
            return RDFFormat.TRIG;
        default:
            return RDFFormat.RDFXML; // Default
    }
}

/**
 * Detecta el formato RDF analizando el contenido del archivo
 */
export function detectFormatFromContent(content: string): RDFFormat {
    const trimmed = content.trim();

    // Detectar RDF/XML
    if (trimmed.startsWith('<?xml') || trimmed.includes('<rdf:RDF') || trimmed.includes('<owl:Ontology')) {
        return RDFFormat.RDFXML;
    }

    // Detectar Turtle
    if (trimmed.includes('@prefix') || trimmed.includes('@base')) {
        return RDFFormat.TURTLE;
    }

    // Detectar N-Triples (líneas con formato <s> <p> <o> .)
    if (/^<[^>]+>\s+<[^>]+>\s+[<"]/.test(trimmed)) {
        return RDFFormat.NTRIPLES;
    }

    // Default a Turtle (más común después de RDF/XML)
    return RDFFormat.TURTLE;
}

/**
 * Carga un archivo OWL desde el filesystem
 */
export async function loadOWLFile(filePath: string): Promise<LoadedOWLFile> {
    try {
        // Verificar que el archivo existe
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Obtener información del archivo
        const stats = fs.statSync(filePath);

        // Leer el contenido
        const content = fs.readFileSync(filePath, 'utf-8');

        // Detectar formato
        const formatFromExt = detectFormatFromExtension(filePath);
        const formatFromContent = detectFormatFromContent(content);

        // Preferir detección por contenido si difiere de la extensión
        const format = formatFromContent;

        return {
            content,
            format,
            size: stats.size,
            path: filePath,
        };
    } catch (error) {
        throw new Error(`Failed to load OWL file: ${error.message}`);
    }
}

/**
 * Carga un archivo OWL desde un buffer (útil para uploads)
 */
export async function loadOWLFromBuffer(
    buffer: Buffer,
    filename: string,
): Promise<LoadedOWLFile> {
    try {
        const content = buffer.toString('utf-8');
        const format = detectFormatFromExtension(filename);

        return {
            content,
            format,
            size: buffer.length,
            path: filename,
        };
    } catch (error) {
        throw new Error(`Failed to load OWL from buffer: ${error.message}`);
    }
}

/**
 * Carga un archivo OWL desde un stream (útil para archivos grandes)
 */
export async function loadOWLFromStream(
    stream: Readable,
    filename: string,
): Promise<LoadedOWLFile> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        let size = 0;

        stream.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
            size += chunk.length;
        });

        stream.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const content = buffer.toString('utf-8');
                const format = detectFormatFromExtension(filename);

                resolve({
                    content,
                    format,
                    size,
                    path: filename,
                });
            } catch (error) {
                reject(new Error(`Failed to process stream: ${error.message}`));
            }
        });

        stream.on('error', (error) => {
            reject(new Error(`Stream error: ${error.message}`));
        });
    });
}

/**
 * Valida que el archivo tenga una extensión soportada
 */
export function isSupportedFormat(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    const supportedExtensions = ['.rdf', '.owl', '.xml', '.ttl', '.n3', '.nt', '.nq', '.trig'];
    return supportedExtensions.includes(ext);
}

/**
 * Obtiene el tipo MIME para un formato RDF
 */
export function getMimeType(format: RDFFormat): string {
    return format;
}
