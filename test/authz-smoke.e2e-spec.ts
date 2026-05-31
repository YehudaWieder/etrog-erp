import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authorization smoke routes (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /auth/login returns 400 for invalid body (public route exists)', async () => {
    await request(app.getHttpServer()).post('/auth/login').send({}).expect(400);
  });

  it('GET /users returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it('GET /messages/inbox returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/messages/inbox').expect(401);
  });

  it('GET /system-config/:seasonId returns 401 without token', async () => {
    await request(app.getHttpServer()).get('/system-config/1').expect(401);
  });
});
