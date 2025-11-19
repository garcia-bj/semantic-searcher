import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { env } from './config/env';
import "dotenv/config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  if (env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Buscador Semántico API')
      .setDescription('API para búsqueda semántica de documentos')
      .setVersion('1.0')
      .addTag('users')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    
    console.log(`📚 Documentación Swagger en: http://localhost:${env.PORT ?? 3000}/api`);
  }

  await app.listen(env.PORT ?? 3000);
  console.log(`🚀 Aplicación corriendo en: http://localhost:${env.PORT ?? 3000}`);
  console.log(`🌍 Entorno: ${env.NODE_ENV}`);
}
bootstrap();
