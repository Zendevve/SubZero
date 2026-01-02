import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchChannelRss, calculateActivityStatus } from './rss-parser';
import { ONE_YEAR_MS, SIX_MONTHS_MS } from '@/constants';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('rss-parser', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateActivityStatus', () => {
    it('returns "unknown" for null timestamp', () => {
      expect(calculateActivityStatus(null)).toBe('unknown');
    });

    it('returns "active" for recent upload (yesterday)', () => {
      const yesterday = Date.now() - 24 * 60 * 60 * 1000;
      expect(calculateActivityStatus(yesterday)).toBe('active');
    });

    it('returns "active" for 5 months ago', () => {
      const fiveMonthsAgo = Date.now() - (SIX_MONTHS_MS - 1000);
      expect(calculateActivityStatus(fiveMonthsAgo)).toBe('active');
    });

    it('returns "dormant" for 7 months ago', () => {
      const sevenMonthsAgo = Date.now() - (SIX_MONTHS_MS + 1000);
      expect(calculateActivityStatus(sevenMonthsAgo)).toBe('dormant');
    });

    it('returns "ghost" for 13 months ago', () => {
      const thirteenMonthsAgo = Date.now() - (ONE_YEAR_MS + 1000);
      expect(calculateActivityStatus(thirteenMonthsAgo)).toBe('ghost');
    });
  });

  describe('fetchChannelRss', () => {
    const channelId = 'UC123';

    it('handles successful RSS fetch', async () => {
      const xml = `
        <feed>
          <entry>
            <published>2023-12-31T00:00:00Z</published>
            <title>New Video</title>
          </entry>
        </feed>
      `;

      fetchMock.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(xml),
      });

      const result = await fetchChannelRss(channelId);

      expect(result.lastUpload).toBe(new Date('2023-12-31T00:00:00Z').getTime());
      expect(result.activityStatus).toBe('active'); // 1 day ago from current mocked time
      expect(result.error).toBeUndefined();
    });

    it('handles empty feed (no videos)', async () => {
      const xml = `<feed></feed>`;

      fetchMock.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(xml),
      });

      const result = await fetchChannelRss(channelId);
      expect(result.activityStatus).toBe('no-videos');
      expect(result.lastUpload).toBeNull();
    });

    it('handles 404 error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await fetchChannelRss(channelId);
      expect(result.error).toContain('Feed not found');
    });

    it('handles fetch failure', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      const result = await fetchChannelRss(channelId);
      expect(result.error).toContain('Network error');
    });
  });
});
