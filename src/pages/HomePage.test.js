import { render, screen } from '@testing-library/react';
import HomePage from './HomePage';

describe('HomePage', () => {
  it('renders app title and subtitle', () => {
    render(<HomePage />);
    expect(screen.getByText('טילדר')).toBeInTheDocument();
    expect(screen.getByText(/מוצאים אהבה במרחב המוגן/)).toBeInTheDocument();
  });

  it('renders login and register actions', () => {
    render(<HomePage />);
    expect(screen.getByText('התחברות')).toBeInTheDocument();
    expect(screen.getByText('הרשמה')).toBeInTheDocument();
  });
});
