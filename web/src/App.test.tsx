import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App.tsx';

afterEach(() => vi.unstubAllGlobals());

describe('App', () => {
  it('shows the backend as online when the health check succeeds', async () => {
    vi.stubGlobal('fetch', () =>
      Promise.resolve(Response.json({ status: 'ok' })),
    );

    render(<App />);

    expect(await screen.findByText('Backend: online')).toBeInTheDocument();
  });

  it('shows the backend as offline when the request fails', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new Error('network down')));

    render(<App />);

    expect(await screen.findByText(/Backend: offline/)).toBeInTheDocument();
  });
});
