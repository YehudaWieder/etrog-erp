// src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  // Enable CORS – allow the Vite dev server and any configured frontend origin
  app.enableCors({
    origin: true, // Allow all origins during development
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Configure Swagger/OpenAPI documentation with metadata and security schemes
  const config = new DocumentBuilder()
    .setTitle('Etrog ERP API')
    .setDescription('Integrated management system for fields, harvests, inventory, and logistics')
    .setVersion('1.0.0')
    // Add relevant tags to categorize API endpoints
    .addTag('General')
    .addTag('Auth')
    .addTag('Users')
    .addTag('Seasons')
    .addTag('Partners')
    .addTag('Categories')
    .addTag('Operations')
    .addTag('Inventory')
    .addTag('Logistics')
    .addTag('Messages')
    .addTag('System Configuration')
    // Enable JWT Authentication in Swagger UI
    .addBearerAuth(
      { 
        type: 'http', 
        scheme: 'bearer', 
        bearerFormat: 'JWT', 
        in: 'header' 
      },
      'access-token',
    )
    .build();

  // Create the OpenAPI document object
  const document = SwaggerModule.createDocument(app, config);

  // Setup Swagger UI at the specified endpoint
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Retains auth tokens on page refresh
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}/api/docs`);
}
bootstrap();