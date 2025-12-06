import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { SearchBar } from '../components/SearchBar';

const noop = () => {};

describe('SearchBar', () => {
  it('renders platform options and triggers callbacks', async () => {
    const user = userEvent.setup();
    const onPlatformChange = vi.fn();
    const onSearch = vi.fn();
    const onHistorySelect = vi.fn();

    render(
      <SearchBar
        platform="youtube"
        onPlatformChange={onPlatformChange}
        defaultValue="Apple"
        onSearch={onSearch}
        history={["Apple Vision Pro", "Oculus"]}
        onHistorySelect={onHistorySelect}
      />
    );

    expect(screen.getByRole('radio', { name: 'YouTube' })).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('radio', { name: 'Reddit' }));
    expect(onPlatformChange).toHaveBeenCalledWith('reddit');

    const input = screen.getByPlaceholderText('例如：Apple Vision Pro');
    await user.clear(input);
    await user.type(input, 'Vision');
    await user.click(screen.getByRole('button', { name: '搜索' }));
    expect(onSearch).toHaveBeenCalledWith('Vision');

    await user.click(screen.getByRole('button', { name: 'Apple Vision Pro' }));
    expect(onHistorySelect).toHaveBeenCalledWith('Apple Vision Pro');
  });
});
