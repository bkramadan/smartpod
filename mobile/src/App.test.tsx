import { render, screen } from '@testing-library/react-native';
import { App } from './App';

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

describe('App', () => {
  it('shows the backend as online when the health check succeeds', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve(Response.json({ status: 'ok' })),
    );

    await render(<App />);

    expect(await screen.findByText('Backend: online')).toBeOnTheScreen();
  });

  it('shows the backend as offline when the request fails', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('network down')));

    await render(<App />);

    expect(await screen.findByText(/Backend: offline/)).toBeOnTheScreen();
  });
});
