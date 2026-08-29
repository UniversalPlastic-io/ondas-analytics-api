import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  });

  // Serve public assets (favicon, etc.)
  app.useStaticAssets(join(process.cwd(), 'public'));
  // Portal clients send an x-csrf-token header. It is allowed through CORS and
  // echoed back so those clients work unchanged; the API itself is stateless and
  // authenticates with the Bearer JWT, so the header is not a security control.
  app.use((req: any, res: any, next: any) => {
    if (!res.getHeader('x-csrf-token')) {
      res.setHeader('x-csrf-token', req.headers['x-csrf-token'] || 'dummy-csrf-token');
    }
    next();
  });

  // When deployed behind Nginx under `/api/*`, Swagger "Try it out" must include `/api`
  // in the generated request URLs. Locally (direct access) the server is `/`.
  const publicApiBasePath = (process.env.PUBLIC_API_BASE_PATH ?? '').trim().replace(/\/+$/g, '');
  const publicApiDisplayUrl = (process.env.PUBLIC_API_DISPLAY_URL ?? '').trim().replace(/\/+$/g, '');
  const baseUrlLabel = publicApiDisplayUrl || publicApiBasePath;

  const configBuilder = new DocumentBuilder()
    .setTitle('Analytics API of ONDAs DataSpace')
    .setDescription(
      'Documentación del API de analíticas. Los nombres de los campos se mantienen en inglés. ' +
        'POST /v1/auth/login devuelve JWT; usar cabecera Authorization: Bearer (token) en POST /v1/analyses/run.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'Token de POST /v1/auth/login' },
      'portal-jwt',
    );

  // List '/' first so Swagger "Try it out" hits Nest routes directly (e.g. local :3000).
  // If '/api' were first while the process only serves /v1 and /docs, GETs would 404.
  if (publicApiBasePath) {
    configBuilder.addServer('/', 'Directo (sin prefijo): desarrollo local o proxy que quita el prefijo al reenviar');
    configBuilder.addServer(
      publicApiBasePath,
      'Tras proxy con prefijo público (p. ej. /api) — úsalo si la URL pública incluye ese prefijo',
    );
  } else {
    configBuilder.addServer('/');
  }

  const config = configBuilder.build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customfavIcon: `${publicApiBasePath || ''}/Recurso%201.svg`,
    customSiteTitle: 'API Analitica ONDAs Docs - Universal Plastic',
    customCss: `
      .swagger-ui .topbar { background-color: #0b1020; border-bottom: 1px solid rgba(255,255,255,.08); }
      /* Hide the default Swagger mark (can be img or svg depending on version). */
      .swagger-ui .topbar .topbar-wrapper img,
      .swagger-ui .topbar .topbar-wrapper svg,
      .swagger-ui .topbar .topbar-wrapper .link span {
        display: none !important;
      }
      .swagger-ui .topbar .topbar-wrapper a { max-width: none; display: block; }
      .swagger-ui .topbar .topbar-wrapper a::before {
        content: "";
        display: inline-block;
        width: 170px;
        height: 34px;
        background: url('${publicApiBasePath || ''}/logo-ondas.svg') no-repeat left center;
        background-size: contain;
      }
      .swagger-ui .topbar .topbar-wrapper a::after {
        content: "${baseUrlLabel ? ` Base URL: ${baseUrlLabel}` : ''}";
        display: inline-block;
        margin-left: 12px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: .2px;
        color: rgba(232,238,252,.75);
        vertical-align: middle;
      }
    `,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
