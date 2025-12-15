import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
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

    await channel.prefetch(1);

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

export const consumeMessages = async (
  callback: (message: any) => Promise<void>
): Promise<void> => {
  try {
    if (!channel) {
      throw new Error('RabbitMQ channel not available');
    }

    await channel.consume(
      QUEUE_NAME,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;

        try {
          const content = msg.content.toString();
          const message = JSON.parse(content);

          logger.info('Message received from queue', { message });

          await callback(message);

          channel?.ack(msg);
          logger.debug('Message acknowledged');
        } catch (error) {
          logger.error('Error processing message:', error);
          channel?.nack(msg, false, false);
        }
      },
      { noAck: false }
    );

    logger.info('Started consuming messages from queue');
  } catch (error) {
    logger.error('Failed to start consuming messages:', error);
    throw error;
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
