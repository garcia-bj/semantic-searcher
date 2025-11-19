import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configurar CORS
  app.enableCors();

  // Aplicar filtros globales
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );

  // Aplicar interceptors globales
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Aplicar validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Buscador Semántico API')
    .setDescription(
      'API REST para búsqueda semántica basada en ontologías OWL con razonamiento automático',
    )
    .setVersion('1.0')
    .addTag('OWL', 'Gestión de ontologías OWL/RDF')
    .addTag('Semantic Search', 'Búsqueda semántica y similitud')
    .addServer('http://localhost:3000', 'Desarrollo')
    .addServer('https://api.semantic-search.com', 'Producción')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'Buscador Semántico - API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`\n🚀 Aplicación corriendo en: http://localhost:${port}`);
  console.log(`📚 Documentación Swagger: http://localhost:${port}/api`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}\n`);
}

bootstrap();
