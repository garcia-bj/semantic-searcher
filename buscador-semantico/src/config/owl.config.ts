export const owlConfig = {
    // Tamaño máximo de archivo en bytes (50MB)
    maxFileSize: 50 * 1024 * 1024,

    // Formatos soportados
    supportedFormats: ['rdf', 'owl', 'xml', 'ttl', 'n3', 'nt', 'nq', 'trig'],

    // Directorio de uploads
    uploadDir: './uploads',

    // Tipos MIME aceptados
    acceptedMimeTypes: [
        'application/rdf+xml',
        'text/turtle',
        'text/n3',
        'application/n-triples',
        'application/n-quads',
        'application/trig',
        'application/xml',
        'text/xml',
        'application/owl+xml',
    ],

    // Timeout para parseo (en milisegundos)
    parseTimeout: 60000, // 60 segundos

    // Límite de triplas por ontología (para prevenir sobrecarga)
    maxTriplesPerOntology: 1000000, // 1 millón de triplas
};
