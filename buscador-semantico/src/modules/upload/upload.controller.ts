import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('owl')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subir archivo OWL/RDF a Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo OWL/RDF (formatos: .owl, .rdf, .ttl, .n3)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Archivo subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Formato de archivo inválido o archivo muy grande' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadOwlFile(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.uploadOwlDocument(file);
  }

  @Get('documents')
  @ApiOperation({ summary: 'Listar todos los documentos OWL subidos' })
  @ApiResponse({ status: 200, description: 'Lista de documentos' })
  async listDocuments() {
    return this.uploadService.listDocuments();
  }

  @Get('document/:id')
  @ApiOperation({ summary: 'Obtener información de un documento específico' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del documento' })
  @ApiResponse({ status: 200, description: 'Información del documento' })
  @ApiResponse({ status: 400, description: 'Documento no encontrado' })
  async getDocument(@Param('id', ParseIntPipe) id: number) {
    return this.uploadService.getDocument(id);
  }

  @Delete('document/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un documento OWL' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del documento' })
  @ApiResponse({ status: 200, description: 'Documento eliminado' })
  @ApiResponse({ status: 400, description: 'Documento no encontrado' })
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    return this.uploadService.deleteDocument(id);
  }
}
