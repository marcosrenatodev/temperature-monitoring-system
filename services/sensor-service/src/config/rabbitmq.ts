import amqp, { Connection, Channel } from 'amqplib';
import { logger } from './logger';

let connection: Connection | null = null;
let channel: Channel | null = null;

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`;
const QUEUE_NAME = process.env.RABBITMQ_QUEUE_SENSOR_DATA || 'sensor_data';

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, {
      durable: true
    });

    logger.info(`Connected to RabbitMQ, queue: ${QUEUE_NAME}`);

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error:', err);
    });

    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed. Reconnecting...');
      setTimeout(connectRabbitMQ, 5000);
    });

  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error);
    setTimeout(connectRabbitMQ, 5000);
  }
};

export const publishMessage = async (message: any): Promise<boolean> => {
  try {
    if (!channel) {
      logger.error('RabbitMQ channel not available');
      return false;
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    channel.sendToQueue(QUEUE_NAME, messageBuffer, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now()
    });

    logger.debug('Message published to queue', { message });
    return true;
  } catch (error) {
    logger.error('Failed to publish message:', error);
    return false;
  }
};

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    logger.info('RabbitMQ connection closed');
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error);
  }
};
