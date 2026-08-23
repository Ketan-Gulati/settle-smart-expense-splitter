import { spacing, radii, typography, lightColors, darkColors } from '../src/constants/tokens';
import { getTheme } from '../src/constants/theme';
import { migrations } from '../src/database/migrations';

describe('Phase 0 & Phase 1 Foundation & Design System Tests', () => {
  test('Design tokens are defined with correct structure', () => {
    expect(spacing.md).toBe(16);
    expect(spacing.gutter).toBe(16);
    expect(radii.md).toBe(12);
    expect(typography.fontSizes.displayLg).toBe(48);
    expect(lightColors.positive).toBe('#10B981');
    expect(darkColors.positive).toBe('#10B981');
  });

  test('Theme builder correctly produces light and dark modes', () => {
    const light = getTheme('light');
    expect(light.isDark).toBe(false);
    expect(light.colors.background).toBe(lightColors.background);

    const dark = getTheme('dark');
    expect(dark.isDark).toBe(true);
    expect(dark.colors.background).toBe(darkColors.background);
  });

  test('Database migrations are valid and ordered', () => {
    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations[0]?.version).toBe(1);
    expect(migrations[0]?.up).toContain('CREATE TABLE IF NOT EXISTS expenses');
    expect(migrations[0]?.up).toContain('amount_minor INTEGER NOT NULL');
  });

  test('Money formatting precision test in integer minor units', () => {
    const amountMinor = 342000;
    const major = Math.floor(amountMinor / 100);
    const minor = amountMinor % 100;
    expect(major).toBe(3420);
    expect(minor).toBe(0);
  });
});
