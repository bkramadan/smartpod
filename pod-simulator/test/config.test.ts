import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('defaults to the local backend', () => {
    expect(loadConfig({})).toEqual({ API_URL: 'http://127.0.0.1:4000' });
  });

  it('refuses an API_URL that is not a web address', () => {
    expect(() => loadConfig({ API_URL: 'not a url' })).toThrow(
      'Invalid environment variables: API_URL',
    );
  });
});
