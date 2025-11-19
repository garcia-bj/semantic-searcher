import {
    Controller,
    Post,
    Get,
    Delete,
    Param,
    UseInterceptors,
    UploadedFile,
    ParseIntPipe,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiParam } from '@nestjs/swagger';
import { OwlService } from './owl.service';
import { UploadOwlDto } from './dto/upload-owl.dto';
import { OwlInfoDto, OntologyStatsDto, UploadResponseDto } from './dto/owl-info.dto';

@ApiTags('OWL Ontologies')
@Controller('owl')
export class OwlController {
    constructor(private readonly owlService: OwlService) { }

    @Post('upload')
    @HttpCode(HttpStatus.CREATED)
    @UseInterceptors(FileInterceptor('file'))
    @ApiOperation({
        summary: 'Upload and parse OWL/RDF file',
        description: 'Uploads an OWL/RDF ontology file, parses it, and stores triples in the database',
    })
    @ApiConsumes('multipart/form-data')
    @ApiResponse({
        status: 201,
        description: 'File uploaded and parsed successfully',
        type: UploadResponseDto,
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid file format or parsing error',
    })
    async uploadOwl(
        @UploadedFile() file: Express.Multer.File,
        @Body() uploadDto: UploadOwlDto,
    ): Promise<UploadResponseDto> {
        return this.owlService.uploadOWL(file, uploadDto.description);
    }

    @Get()
    @ApiOperation({
        summary: 'List all OWL documents',
        description: 'Returns a list of all uploaded OWL documents',
    })
    @ApiResponse({
        status: 200,
        description: 'List of OWL documents',
        type: [OwlInfoDto],
    })
    async listOwlDocuments(): Promise<OwlInfoDto[]> {
        return this.owlService.listOwlDocuments();
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Get OWL document info',
        description: 'Returns information about a specific OWL document',
    })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({
        status: 200,
        description: 'OWL document information',
        type: OwlInfoDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Document not found',
    })
    async getOwlDocument(@Param('id', ParseIntPipe) id: number): Promise<OwlInfoDto> {
        return this.owlService.getOwlDocument(id);
    }

    @Get(':id/stats')
    @ApiOperation({
        summary: 'Get ontology statistics',
        description: 'Returns detailed statistics about the ontology (classes, properties, individuals, namespaces)',
    })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({
        status: 200,
        description: 'Ontology statistics',
        type: OntologyStatsDto,
    })
    @ApiResponse({
        status: 404,
        description: 'Document not found',
    })
    async getOntologyStats(@Param('id', ParseIntPipe) id: number): Promise<OntologyStatsDto> {
        return this.owlService.getOntologyStats(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete OWL document',
        description: 'Deletes an OWL document and all its associated triples',
    })
    @ApiParam({ name: 'id', description: 'Document ID' })
    @ApiResponse({
        status: 204,
        description: 'Document deleted successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Document not found',
    })
    async deleteOwlDocument(@Param('id', ParseIntPipe) id: number): Promise<void> {
        await this.owlService.deleteOwlDocument(id);
    }
}
