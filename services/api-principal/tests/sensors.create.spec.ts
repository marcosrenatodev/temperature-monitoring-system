import request from 'supertest';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

// Mocks must come BEFORE importing app/routes/controllers
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));


type SensorCreateInput = {
  sensor_id: string;
  name: string;
  location?: string;
  min_temperature: number;
  max_temperature: number;
  min_humidity: number;
  max_humidity: number;
  active?: boolean;
};

type SensorRecord = SensorCreateInput;
type SensorFindResult = { sensor_id: string } | null;

const sensorModelMock = {
  findById: jest.fn() as jest.MockedFunction<(id: string) => Promise<SensorFindResult>>,
  create: jest.fn() as jest.MockedFunction<(sensor: SensorCreateInput) => Promise<SensorRecord>>,
  findAll: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findActive: jest.fn(),
};



jest.mock('../src/models/Sensor', () => ({
  SensorModel: sensorModelMock,
}));

import { createApp } from '../src/app';

describe('POST /api/sensors (validation with Zod)', () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when required fields are missing', async () => {
    sensorModelMock.findById.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/sensors')
      .send({
        sensor_id: 'sensor-001',
        // name missing
        min_temperature: 18,
        max_temperature: 26,
        min_humidity: 40,
        max_humidity: 60,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Validation error');
    expect(Array.isArray(res.body.details)).toBe(true);
    expect(sensorModelMock.create).not.toHaveBeenCalled();
  });

  it('returns 400 when sensor_id has invalid characters', async () => {
    const res = await request(app)
      .post('/api/sensors')
      .send({
        sensor_id: 'sensor 001',
        name: 'Sala Principal',
        min_temperature: 18,
        max_temperature: 26,
        min_humidity: 40,
        max_humidity: 60,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
    expect(sensorModelMock.create).not.toHaveBeenCalled();
  });

  it('returns 400 when min_temperature >= max_temperature', async () => {
    const res = await request(app)
      .post('/api/sensors')
      .send({
        sensor_id: 'sensor-001',
        name: 'Sala Principal',
        min_temperature: 26,
        max_temperature: 26,
        min_humidity: 40,
        max_humidity: 60,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
    expect(res.body.details.some((d: any) => d.path === 'min_temperature')).toBe(true);
  });

  it('returns 400 when numeric fields are not numbers', async () => {
    const res = await request(app)
      .post('/api/sensors')
      .send({
        sensor_id: 'sensor-001',
        name: 'Sala Principal',
        min_temperature: 'abc',
        max_temperature: 26,
        min_humidity: 40,
        max_humidity: 60,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
    expect(sensorModelMock.create).not.toHaveBeenCalled();
  });

  it('coerces numeric strings and returns 201 for valid payload', async () => {
    sensorModelMock.findById.mockResolvedValue(null);
    sensorModelMock.create.mockResolvedValue({
      sensor_id: 'sensor-001',
      name: 'Sala Principal',
      location: 'Andar 1',
      min_temperature: 18,
      max_temperature: 26,
      min_humidity: 40,
      max_humidity: 60,
      active: true,
    });

    const res = await request(app)
      .post('/api/sensors')
      .send({
        sensor_id: 'sensor-001',
        name: 'Sala Principal',
        location: 'Andar 1',
        min_temperature: '18',
        max_temperature: '26',
        min_humidity: '40',
        max_humidity: '60',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sensor_id).toBe('sensor-001');

    // ensure controller received coerced numbers
    expect(sensorModelMock.create).toHaveBeenCalledTimes(1);
    const createArg = sensorModelMock.create.mock.calls[0][0];
    expect(typeof createArg.min_temperature).toBe('number');
    expect(createArg.min_temperature).toBe(18);
  });

  it('returns 409 when sensor_id already exists', async () => {
    sensorModelMock.findById.mockResolvedValue({ sensor_id: 'sensor-001' });

    const res = await request(app)
      .post('/api/sensors')
      .send({
        sensor_id: 'sensor-001',
        name: 'Sala Principal',
        min_temperature: 18,
        max_temperature: 26,
        min_humidity: 40,
        max_humidity: 60,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Sensor with this ID already exists');
    expect(sensorModelMock.create).not.toHaveBeenCalled();
  });

  it('returns 400 for malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/sensors')
      .set('Content-Type', 'application/json')
      .send('{"sensor_id":"sensor-001"'); // missing closing brace

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid JSON body');
  });
});
