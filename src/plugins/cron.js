import cron from 'node-cron';

export default async function cronPlugin(fastify, opts) {
  // 1. Status 수집 크론
  cron.schedule(opts, async () => {
    try {
      const response = await fastify.inject({
        method: 'POST',
        url: '/v1/cli_manager',
        payload: { type: 'status' },
      });
      const { data } = JSON.parse(response.payload);
      fastify.log.info({ data }, '[SUCCESS] Status Cron');
      return data;
    } catch (error) {
      fastify.log.error(`[FAILED] status ERROR MSG: ${error.message}`);
    }
  });

  // 2. Activity 수집 크론
  cron.schedule(opts, async () => {
    try {
      const response = await fastify.inject({
        method: 'POST',
        url: '/v1/cli_manager',
        payload: { type: 'activity' },
      });
      const { data } = JSON.parse(response.payload);
      fastify.log.info({ data }, '[SUCCESS] Activity Cron');
      return data;
    } catch (error) {
      fastify.log.error(`[FAILED] activity ERROR MSG: ${error.message}`);
    }
  });
}
