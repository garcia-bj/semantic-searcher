import { Injectable, BadRequestException } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) {}

  async uploadOwlDocument(file: Express.Multer.File) {
    const allowedMimeTypes = [
      'application/rdf+xml',
      'text/turtle',
      'application/x-turtle',
      'text/plain',
      'application/xml',
      'text/xml',
    ];

    if (!allowedMimeTypes.includes(file.mimetype) && !file.originalname.match(/\.(owl|rdf|ttl|n3)$/)) {
      throw new BadRequestException(
        'Formato de archivo no válido. Use archivos OWL, RDF, TTL o N3',
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo es demasiado grande. Máximo 50MB');
    }

    try {
      const result = await this.cloudinaryService.uploadFile(file, 'owl-docs');
      const document = await this.prisma.document.create({
        data: {
          nombre: file.originalname,
          publicId: result.public_id,
          url: result.secure_url,
          size: BigInt(file.size),
          mimeType: file.mimetype,
          uploadedAt: new Date(),
        },
      });

      return {
        id: document.id,
        nombre: document.nombre,
        publicId: document.publicId,
        url: document.url,
        size: file.size,
        uploadedAt: document.uploadedAt,
      };
    } catch (error) {
      throw new BadRequestException(`Error al subir el archivo: ${error.message}`);
    }
  }

  async getDocument(id: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new BadRequestException('Documento no encontrado');
    }

    return document;
  }

  async listDocuments() {
    return this.prisma.document.findMany({
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async deleteDocument(id: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new BadRequestException('Documento no encontrado');
    }
    await this.cloudinaryService.deleteFile(document.publicId);
    await this.prisma.document.delete({
      where: { id },
    });

    return { message: 'Documento eliminado exitosamente' };
  }
}
