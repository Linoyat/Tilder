import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn((url) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(
          url && url.includes('unread-count') ? { count: 0 } : []
        ),
    })
  );
  localStorage.clear();
});

test('App renders and shows app branding', () => {
  render(<App />);
  const branding = screen.getByText(/טילדר/);
  expect(branding).toBeInTheDocument();
});

test('App renders home with register option', () => {
  render(<App />);
  const register = screen.getByText(/הרשמה/);
  expect(register).toBeInTheDocument();
});
