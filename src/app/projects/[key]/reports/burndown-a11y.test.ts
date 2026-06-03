import { describe, expect, it } from 'vitest';
import { burndownAriaLabel, type BurndownPoint, type BurndownSeries } from './burndown-a11y';

function point(over: Partial<BurndownPoint>): BurndownPoint {
  return {
    date: '2025-01-01',
    label: 'Jan 1',
    ideal: 0,
    remaining: 0,
    ...over,
  };
}

function series(points: BurndownPoint[], totalPoints = 0, totalDays = 0): BurndownSeries {
  return { points, totalPoints, totalDays };
}

describe('burndownAriaLabel', () => {
  it('falls back to a "no data yet" summary when the series has no actuals', () => {
    const sut = series(
      [point({ remaining: null }), point({ date: '2025-01-02', label: 'Jan 2', remaining: null })],
      30,
      10,
    );

    const label = burndownAriaLabel('JUP Sprint 1', sut);

    expect(label).toContain('Burndown chart for JUP Sprint 1');
    expect(label).toContain('30 points committed');
    expect(label).toContain('over 10 days');
    expect(label).toContain('No actual remaining data yet');
  });

  it('reports "on track" when the latest remaining matches the ideal within tolerance', () => {
    const sut = series(
      [
        point({ ideal: 30, remaining: 30 }),
        point({ date: '2025-01-02', label: 'Jan 2', ideal: 20, remaining: 20.2 }),
      ],
      30,
      3,
    );

    const label = burndownAriaLabel('JUP Sprint 2', sut);

    expect(label).toContain('As of Jan 2');
    expect(label).toContain('20.2 points remain');
    expect(label).toContain('ideal of 20');
    expect(label).toContain('on track with the ideal line');
  });

  it('reports "behind the ideal" with the gap when remaining exceeds ideal', () => {
    const sut = series(
      [
        point({ ideal: 30, remaining: 30 }),
        point({ date: '2025-01-02', label: 'Jan 2', ideal: 15, remaining: 22 }),
      ],
      30,
      3,
    );

    const label = burndownAriaLabel('JUP Sprint 3', sut);

    expect(label).toContain('22 points remain');
    expect(label).toContain('ideal of 15');
    expect(label).toContain('7.0 points behind the ideal');
  });

  it('reports "ahead of the ideal" with the gap when remaining is below ideal', () => {
    const sut = series(
      [
        point({ ideal: 30, remaining: 30 }),
        point({ date: '2025-01-02', label: 'Jan 2', ideal: 20, remaining: 12 }),
      ],
      30,
      3,
    );

    const label = burndownAriaLabel('JUP Sprint 4', sut);

    expect(label).toContain('12 points remain');
    expect(label).toContain('ideal of 20');
    expect(label).toContain('8.0 points ahead of the ideal');
  });

  it('uses the latest day with actual data, not the absolute final day', () => {
    // Mid-sprint: today is day 2, days 3-5 have no remaining yet.
    const sut = series(
      [
        point({ ideal: 30, remaining: 30 }),
        point({ date: '2025-01-02', label: 'Jan 2', ideal: 24, remaining: 25 }),
        point({ date: '2025-01-03', label: 'Jan 3', ideal: 18, remaining: null }),
        point({ date: '2025-01-04', label: 'Jan 4', ideal: 12, remaining: null }),
      ],
      30,
      5,
    );

    const label = burndownAriaLabel('JUP Sprint 5', sut);

    expect(label).toContain('As of Jan 2');
    expect(label).toContain('25 points remain');
    // Make sure we did not pick a null day
    expect(label).not.toContain('As of Jan 3');
    expect(label).not.toContain('As of Jan 4');
  });
});
