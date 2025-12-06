import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { VideoList } from '../components/VideoList';
describe('VideoList', () => {
    const baseTime = new Date('2025-01-01T00:00:00Z').toISOString();
    const youtubeItem = {
        platform: 'youtube',
        keyword: 'Apple',
        id: 'yt1',
        title: 'YouTube Video',
        author: 'Channel',
        publishedAt: baseTime,
        fetchedAt: baseTime,
        url: 'https://www.youtube.com/watch?v=yt1',
        thumbnailUrl: 'https://img',
        viewCount: 1000,
        score: null,
        labels: ['Channel']
    };
    const redditItem = {
        platform: 'reddit',
        keyword: 'Apple',
        id: 't3_123',
        title: 'Reddit Post',
        author: 'redditor',
        publishedAt: baseTime,
        fetchedAt: baseTime,
        url: 'https://reddit.com',
        permalink: 'https://www.reddit.com/r/apple',
        thumbnailUrl: null,
        viewCount: null,
        score: 42,
        labels: ['apple']
    };
    it('renders youtube and reddit specific fields', () => {
        render(_jsx(VideoList, { items: [youtubeItem, redditItem], onCopyLink: () => { } }));
        expect(screen.getByText('YouTube Video')).toBeInTheDocument();
        expect(screen.getByText(/观看量/)).toBeInTheDocument();
        expect(screen.getByText('Reddit Post')).toBeInTheDocument();
        expect(screen.getByText(/得分：42/)).toBeInTheDocument();
        expect(screen.getAllByText(/r\/apple/).length).toBeGreaterThan(0);
    });
});
