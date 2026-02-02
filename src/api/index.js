import axios from 'axios';
import 'dotenv/config';
import fastify from 'fastify';

const BASE_URL = process.env.IAPI_BASE_URL;

const api = axios.create({ baseURL: BASE_URL });

// TODO: hwId는 추후에 조회해서 변경가능하도록 변경
export const postHardwareLog = async (endpoint, params) => {
  try {
    console.log(endpoint, params);
    const { status } = await api.post(endpoint, params);
    if (status !== 200) throw new Error(status);
  } catch (error) {
    fastify.log.error(`[FAILED] postHardwareLog MSG: ${error}`);
  }
};
