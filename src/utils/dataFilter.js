import { DEVICE_INFO, NETWOK_INFO, POWER_INFO, SYSTEM_INFO } from '../assets/command.js';
import { runCommand } from './index.js';
import os from 'os';

// 전원동작 시간 필터링
export const parsePowerData = async () => {
  const raw = await runCommand(POWER_INFO);
  const m = { onCnt: 0, onDur: 0, offCnt: 0, offDur: 0 };

  if (!raw || !raw.includes('|')) return m;

  const [onTimeStr, historyStr] = raw.split('|').map((s) => s.trim());
  const history = historyStr ? historyStr.split(',') : [];

  if (onTimeStr) {
    const onDate = new Date(onTimeStr);
    m.onCnt = onDate.toISOString().split('.')[0] + 'Z';
    m.onDur = Math.floor((Date.now() - onDate.getTime()) / 1000);

    // 가장 최근 과거 리부트 기록(history[0])을 종료 시점으로 가정하여 offDur 계산
    if (history.length > 0) {
      const offDate = new Date(history[0]);
      // 리부트 기록에 연도가 없어 미래로 잡힐 경우 1년 전으로 보정
      if (offDate > onDate) offDate.setFullYear(offDate.getFullYear() - 1);

      m.offCnt = offDate.toISOString().split('.')[0] + 'Z';
      m.offDur = Math.floor((onDate.getTime() - offDate.getTime()) / 1000);
    }
  }
  return m;
};

// NOTE: 시스템 정보 파싱
export const parseSystemData = async () => {
  const raw = await runCommand(SYSTEM_INFO);
  const p = raw.split('|');

  // 1. CPU: 합산 점유율을 실제 코어 수로 나눔 (가장 정확한 방법)
  const coreCount = os.cpus().length;
  const cpuPercent = (parseFloat(p[3]) / coreCount).toFixed(1);

  // 2. Memory: Mac 페이지 단위(4096) 보정 및 MB 환산
  const [totalByte, usedByte] = p[4].split('-').map(Number);

  // 단위를 MB로 통일 (1024 * 1024 = 1,048,576)
  const totalMB = totalByte / (1024 * 1024);
  const usedMB = usedByte / (1024 * 1024);

  // 퍼센트 계산 (0으로 나누기 방지 포함)
  const usagePercent = totalMB > 0 ? Math.min(100, Math.floor((usedMB / totalMB) * 100)) : 0;

  // 3. Disk
  const [usedDisk, totalDisk] = (p[5] || '0/1').replace(/[A-Za-z]/g, '').split('/');
  const usageDisk = Math.min(100, Math.floor((parseFloat(usedDisk) / parseFloat(totalDisk)) * 100));

  return {
    geo: p[0] || 'Unknown',
    power: p[1] || 'N/A',
    temp: p[2] === '0' || !p[2] ? 'N/A' : `${p[2]}°C`,
    cpu: `${cpuPercent}%`,
    mem: `${usagePercent}%`,
    disk: `${isNaN(usageDisk) ? 0 : usageDisk}%`,
  };
};

// NOTE: 디바이스 정보 파싱
export const parseDeviceData = async () => {
  const raw = await runCommand(DEVICE_INFO);
  const m = { usbCnt: 0, usbDur: 0, trafficAmount: 0 };

  if (!raw || !raw.includes('|')) return m;

  try {
    // CLI 결과: "개수|USB지속시간|네트워크활성시간"
    const [cnt, uDur, nDur] = raw.split('|').map((s) => s.trim());

    // 1. 외부장치 연결 갯수 (숫자로 변환)
    m.usbCnt = parseInt(cnt) || 0;

    // 2. 외부장치 연결 시간 (가장 오래된 장치의 지속 초)
    m.usbDur = parseInt(uDur) || 0;

    // 3. 네트워크 이용 시간 (인터페이스가 UP 된 이후의 초)
    // 리눅스는 정확한 초를 반환하고, 맥은 상황에 따라 고정값(3600) 혹은 0을 반환하도록 설계됨
    m.trafficAmount = parseInt(nDur) || 0;
  } catch (err) {
    console.error('Device/Net Log Parsing Error:', err);
  }

  return m;
};

// NOTE: 네트워크 정보 파싱
export const parseNetworkData = () => {
  const rawData = runCommand(NETWOK_INFO);
  // 기본값 정의
  const defaultConfig = {
    ping: false,
    down: 0,
    up: 0,
    ip: 'N/A',
    isp: 'N/A',
    country: 'N/A',
    geo: { lat: 0, lon: 0 },
    ssid: 'N/A',
    freq: 'N/A',
    signal: 0,
    ap_count: 0,
  };

  if (!rawData || typeof rawData !== 'string') return defaultConfig;

  const parts = rawData.split('|');

  // 1. 외부 정보(JSON) 파싱 처리
  let externalInfo = {};
  try {
    // parts[4]에 위치한 JSON 파싱 (index는 CLI printf 순서에 따름)
    externalInfo = JSON.parse(parts[3] || '{}');
  } catch (e) {
    externalInfo = {};
  }

  // 2. 지리 정보(geo) 분리 처리
  const loc = (externalInfo.loc || '0,0').split(',');
  const geoObj = {
    lat: parseFloat(loc[0]) || 0,
    lon: parseFloat(loc[1]) || 0,
  };

  // 3. 트래픽 데이터 분리 (down|up 형태 대응)
  const traffic = (parts[1] || '0|0').split('|');

  return {
    ping: parts[0] === 'Success',
    down: parseInt(traffic[0]) || 0,
    up: parseInt(traffic[1]) || 0,
    ip: parts[2] || 'N/A',
    isp: externalInfo.org || 'N/A',
    country: externalInfo.country || 'N/A',
    geo: geoObj,
    ssid: parts[4] || 'N/A',
    freq: parts[5] || 'N/A',
    signal: parseInt(parts[6]) || 0,
    ap_count: parseInt(parts[7]) || 0,
  };
};
