import axios from 'axios';
import 'dotenv/config';

const BASE_URL = process.env.IAPI_BASE_URL;

const api = axios.create({ baseURL: BASE_URL });

// TODO: hwId는 추후에 조회해서 변경가능하도록 변경
export const postStatusLog = async (hwId, system, network) => {
  try {
    const params = {
      hwId,
      status: system,
      network,
    };
    const { status } = await api.post('/v1/status_log', params);
    if (status !== 200) throw new Error(status);
    console.log('[SUCCESS] postStatusLog');
  } catch (error) {
    console.log(`[FAILED] postStatusLog msg: ${error.message}`);
  }
};

export const postActivityLog = async (hwId, activityType, value, meta) => {
  try {
    const params = {
      hwId,
      activityType,
      value,
      meta,
    };
    const { status } = await api.post('/v1/activity_log', params);
    if (status !== 200) throw new Error(status);
    console.log('[SUCCESS] activityLog');
  } catch (error) {
    console.log(`[FAILED] postActivityLog msg: ${error}`);
  }
};

ex;
