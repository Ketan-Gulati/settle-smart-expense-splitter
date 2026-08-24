export class Money {
  /**
   * Parse a major currency amount (e.g. 250.00 or "250.50") into integer minor units (paise).
   */
  public static toMinor(major: number | string): bigint {
    if (typeof major === 'string') {
      const clean = major.trim().replace(/,/g, '');
      const num = parseFloat(clean);
      if (isNaN(num)) throw new Error(`Invalid money string: ${major}`);
      return BigInt(Math.round(num * 100));
    }
    if (isNaN(major)) throw new Error('Invalid money number: NaN');
    return BigInt(Math.round(major * 100));
  }

  /**
   * Convert integer minor units into major currency decimal number for display/serialization.
   */
  public static toMajor(minor: bigint | number): number {
    return Number(minor) / 100;
  }

  /**
   * Format minor units into standard Indian currency format (e.g. "₹2,400.00" or "+₹4,366.66").
   */
  public static format(minor: bigint | number, currency = 'INR', showSign = false): string {
    const major = this.toMajor(minor);
    const symbol = currency === 'INR' ? '₹' : currency + ' ';
    const isNegative = major < 0;
    const isPositive = major > 0;
    const absStr = Math.abs(major).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const sign = showSign ? (isPositive ? '+' : isNegative ? '-' : '') : isNegative ? '-' : '';
    return `${sign}${symbol}${absStr}`;
  }

  /**
   * Allocate total amount minor among N participants deterministically, ensuring sum of shares === total exactly.
   * Remainder paise are distributed 1 paise at a time to the first remainder participants.
   */
  public static allocateEqual(totalMinor: bigint, participantCount: number): bigint[] {
    if (participantCount <= 0) throw new Error('Participant count must be > 0');
    if (totalMinor < 0n) throw new Error('Total amount must be non-negative');

    const countBig = BigInt(participantCount);
    const baseShare = totalMinor / countBig;
    const remainder = Number(totalMinor % countBig);

    const result: bigint[] = [];
    for (let i = 0; i < participantCount; i++) {
      result.push(baseShare + (i < remainder ? 1n : 0n));
    }

    return result;
  }
}
