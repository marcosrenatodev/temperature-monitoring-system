import { z } from 'zod';

// Helpers
const numberFromBody = (field: string, opts?: { min?: number; max?: number }) => {
  let schema = z
    .number({
      required_error: `${field} is required`,
      invalid_type_error: `${field} must be a number`,
    })
    .finite(`${field} must be a finite number`);

  if (typeof opts?.min === 'number') {
    schema = schema.min(opts.min, `${field} must be >= ${opts.min}`);
  }
  if (typeof opts?.max === 'number') {
    schema = schema.max(opts.max, `${field} must be <= ${opts.max}`);
  }

  return z.preprocess((value) => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') return NaN;
      return Number(trimmed);
    }
    return value;
  }, schema);
};

/**
 * POST /api/sensors
 *
 * Accepts numeric fields either as numbers or numeric strings.
 * Rejects unknown properties (`strict`).
 */
export const createSensorBodySchema = z
  .object({
    sensor_id: z
      .string({ required_error: 'sensor_id is required' })
      .trim()
      .min(1, 'sensor_id is required')
      .max(100, 'sensor_id must be at most 100 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'sensor_id must contain only letters, numbers, underscore or dash'),

    name: z
      .string({ required_error: 'name is required' })
      .trim()
      .min(1, 'name is required')
      .max(255, 'name must be at most 255 characters'),

    location: z
      .string()
      .trim()
      .min(1, 'location cannot be empty')
      .max(255, 'location must be at most 255 characters')
      .optional(),

    min_temperature: numberFromBody('min_temperature', { min: -100, max: 200 }),
    max_temperature: numberFromBody('max_temperature', { min: -100, max: 200 }),

    min_humidity: numberFromBody('min_humidity', { min: 0, max: 100 }),
    max_humidity: numberFromBody('max_humidity', { min: 0, max: 100 }),

    active: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.min_temperature >= data.max_temperature) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['min_temperature'],
        message: 'min_temperature must be less than max_temperature',
      });
    }

    if (data.min_humidity >= data.max_humidity) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['min_humidity'],
        message: 'min_humidity must be less than max_humidity',
      });
    }
  });

export type CreateSensorBody = z.infer<typeof createSensorBodySchema>;
