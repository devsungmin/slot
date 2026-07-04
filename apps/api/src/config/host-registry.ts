/**
 * 호스트 레지스트리 (JSON 파일 영속화).
 *
 * - 조회: listHosts()/getHost() — data/hosts.json 이 있으면 그 내용, 없으면 defaultHosts.
 * - 수정: upsertHost()/removeHost() — 관리 API 에서 호출하며, 변경 시 파일에 저장한다.
 * - 첫 번째 호스트가 기본 호스트다 (slug 미지정/미존재 시 폴백, 삭제 불가).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import { HostConfig, defaultHosts } from './schedule.config';

// booking.repository 와 동일한 데이터 디렉토리 (dist/config → ../../data)
const file = resolve(process.env.DATA_DIR ?? resolve(__dirname, '..', '..', 'data'), 'hosts.json');

let cache: HostConfig[] | null = null;

const load = (): HostConfig[] => {
  if (cache) return cache;
  try {
    if (existsSync(file)) {
      cache = JSON.parse(readFileSync(file, 'utf-8')) as HostConfig[];
      Logger.log(`Loaded ${cache.length} hosts from ${file}`, 'HostRegistry');
      return cache;
    }
  } catch (err) {
    Logger.error(`호스트 파일 로드 실패 (${file}): ${String(err)}`, 'HostRegistry');
  }
  cache = defaultHosts.map((h) => ({ ...h }));
  return cache;
};

const persist = (): void => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(load(), null, 2), 'utf-8');
};

/** 전체 호스트 목록 (첫 번째가 기본 호스트) */
export const listHosts = (): HostConfig[] => load();

/** slug 로 호스트를 찾는다. 없으면 기본 호스트. */
export const getHost = (slug?: string): HostConfig => {
  const hosts = load();
  return hosts.find((h) => h.slug === slug) ?? hosts[0];
};

/** 호스트 추가/수정 (slug 기준 upsert) 후 저장 */
export const upsertHost = (host: HostConfig): HostConfig => {
  const hosts = load();
  const idx = hosts.findIndex((h) => h.slug === host.slug);
  if (idx === -1) hosts.push(host);
  else hosts[idx] = host;
  persist();
  return host;
};

/** 호스트 삭제. 기본 호스트(첫 번째)는 삭제할 수 없다. */
export const removeHost = (slug: string): boolean => {
  const hosts = load();
  if (hosts[0]?.slug === slug) {
    throw new Error('기본 호스트는 삭제할 수 없습니다.');
  }
  const idx = hosts.findIndex((h) => h.slug === slug);
  if (idx === -1) return false;
  hosts.splice(idx, 1);
  persist();
  return true;
};
