import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the SkyMiles header and main sections', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { name: /^SkyMiles Travel$/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Top Destinations/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /About SkyMiles Travels/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^Contact Us$/i })).toBeInTheDocument();
});
