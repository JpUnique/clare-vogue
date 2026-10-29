import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMeasurementSetDto, ListCustomersDto } from './customer.dto.js';

describe('customer request validation', () => {
  it('accepts a dated set with positive standard and custom measurements', () => {
    const input = plainToInstance(CreateMeasurementSetDto, {
      measuredAt: '2026-10-27T10:00:00+01:00',
      unit: 'cm',
      bust: '90.25',
      customMeasurements: [{ name: 'Neck', value: '32.5' }],
    });

    expect(validateSync(input)).toHaveLength(0);
  });

  it.each(['0', '-1', '1000000', '12.345', 'abc'])(
    'rejects invalid measurement values: %s',
    (value) => {
      const input = plainToInstance(CreateMeasurementSetDto, {
        measuredAt: '2026-10-27',
        unit: 'cm',
        bust: value,
      });

      expect(validateSync(input)).not.toHaveLength(0);
    },
  );

  it('rejects unsupported measurement units and malformed custom data', () => {
    const input = plainToInstance(CreateMeasurementSetDto, {
      measuredAt: '2026-10-27',
      unit: 'yards',
      bust: '90',
      customMeasurements: null,
    });

    expect(validateSync(input)).not.toHaveLength(0);
  });

  it('transforms bounded customer-list pagination values', () => {
    const input = plainToInstance(ListCustomersDto, {
      limit: '50',
      offset: '20',
      includeArchived: 'true',
    });

    expect(validateSync(input)).toHaveLength(0);
    expect(input.limit).toBe(50);
    expect(input.offset).toBe(20);

    const invalid = plainToInstance(ListCustomersDto, { limit: '1000' });
    expect(validateSync(invalid)).not.toHaveLength(0);
  });
});
