import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

const consoleFormat = winston.format.printf((info) => {
  const { level, message, timestamp, service, ...meta } = info;
  const svc = service ? ` [${service}]` : '';
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}${svc}: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true })),

  defaultMeta: { service: 'notification-service' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        consoleFormat
      )
    })
  ]
});
