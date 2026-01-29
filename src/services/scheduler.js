import fastify from 'fastify';
import { cron } from 'node-cron';

export const setupScheduler = (fastify) => {
  cron.schedule('* * * * *', async () => {
    fastify.log.info(`[Cron] Collection system metrics...`);
  });
};
