// import { postStatusLog } from './src/api/index.js';
import Fastify from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import {
  parseDeviceData,
  parseNetworkData,
  parsePowerData,
  parseSystemData,
} from './src/utils/dataFilter.js';
import cronPlugin from './src/plugins/cron.js';
import { postHardwareLog } from './src/api/index.js';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST'],
});
// Swagger 플러그인 등록
await fastify.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'piCare 데이터 수집 API',
      description: 'piCare 분석 로그 중계 서버',
      version: '1.0.0',
    },
  },
});
await fastify.register(fastifySwaggerUi, {
  routePrefix: '/docs',
});
// NOTE: API Route
// NOTE: 학습 데이터 수집
fastify.post(
  '/v1/feature_log',
  {
    schema: {
      description: 'piCare 학습 종류 분석 데이터 수집 API',
      tags: ['학습 종류 수집'],
      body: {
        type: 'object',
        required: ['featureId', 'hwId'],
        properties: {
          hwId: { type: 'string' },
          featureId: { type: 'string' },
          command: { type: 'string' },
          duration: { type: 'number' },
        },
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
      },
    },
  },
  async (request, reply) => {
    try {
      const payload = request.body;
      // TODO: DB 서버로 보낼 파싱 및 보내기
      fastify.log.info('[SUCCESS] feature MSG: ', payload);
      await postHardwareLog('/v1/feature_log', payload);
      return { success: true };
    } catch (error) {
      fastify.log.error('[FAILED] feature MSG: ', error);
      return reply.status(500).send({ success: false, error: 'Relay Failed' });
    }
  },
);

// NOTE: 상호작용 데이터 수집
fastify.post(
  '/v1/interaction_log',
  {
    schema: {
      description: 'piCare 상호작용 데이터 수집 API',
      tags: ['상호작용 데이터 수집'],
      body: {
        type: 'object',
        required: ['type', 'hwId'],
        properties: {
          hwId: { type: 'string' },
          type: { type: 'string' },
          content: { type: 'string' },
        },
      },
      response: {
        200: { type: 'object', properties: { success: { type: 'boolean' } } },
      },
    },
  },
  async (request, reply) => {
    try {
      const payload = request.body;
      await postHardwareLog('/v1/interaction_log', payload);
      return { success: true };
    } catch (error) {
      fastify.log.error('[FAILED] interation MSG : ', error);
      return reply.status(500).send({ success: false, error: 'Relay Failed' });
    }
  },
);
// Status, Activity API 수집
fastify.post(
  '/v1/cli_manager',
  {
    schema: {
      description: 'Activity, Status 관련 하드웨어 데이터 수집',
      tags: ['하드웨어 데이터 수집'],
      body: {
        type: 'object',
        required: ['type'],
        properties: {
          type: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          required: ['success'], // success는 무조건 있어야 함
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', additionalProperties: true },
          },
        },
      },
    },
  },
  async (request, reply) => {
    try {
      const { type } = request.body;
      let result = {};
      switch (type) {
        case 'status': {
          const system = await parseSystemData();
          const device = await parseDeviceData();
          const network = await parseNetworkData();
          result = {
            hwId: '69797b51839fad67e620eff6',
            status: { ...system, ...device },
            network,
          };
          break;
        }
        case 'activity': {
          const power = await parsePowerData();
          result = {
            hwId: '69797b51839fad67e620eff6',
            activityType: 'power',
            value: 1,
            meta: power,
          };
          break;
        }
        default: {
          throw new Error('No case');
        }
      }
      await postHardwareLog(`/v1/${type}_log`, result);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      fastify.log.error(`[FAILED] cli_manager MSG: ${error}`);

      return reply.status(500).send({
        success: false,
        data: { message: error.message },
      });
    }
  },
);
// Cron 등록
await fastify.register(cronPlugin, '0 * * * *');
// NOTE: 서버 시작
const start = async () => {
  try {
    await fastify.listen({ port: 4000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
