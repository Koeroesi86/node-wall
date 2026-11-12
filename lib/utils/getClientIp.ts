import type { LambdaEvent } from '../types';

const loopback = '127.0.0.1,::1,::ffff:127.0.0.1';

/**
 * The client address. `X-Forwarded-For` is honoured only when the direct peer is a trusted proxy
 * (`TRUSTED_PROXIES`, comma separated, default loopback). The last entry is the one appended by that proxy.
 */
export default ({ remoteAddress = '', headers }: Pick<LambdaEvent, 'remoteAddress' | 'headers'>): string => {
  const trusted = (process.env.TRUSTED_PROXIES ?? loopback).split(',').map(item => item.trim());
  const forwarded = (headers['x-forwarded-for'] ?? headers['X-Forwarded-For'] ?? '').split(',').pop()?.trim();

  return trusted.includes(remoteAddress) && forwarded ? forwarded : remoteAddress;
};
