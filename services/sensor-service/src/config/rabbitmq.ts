import amqp, { type Channel, type ChannelModel } from 'amqplib'
import { logger } from './logger'

let channelModel: ChannelModel | null = null
let channel: Channel | null = null

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`
const QUEUE_NAME = process.env.RABBITMQ_QUEUE_SENSOR_DATA || 'sensor_data'

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const conn = await amqp.connect(RABBITMQ_URL) // ✅ ChannelModel
    const ch = await conn.createChannel()

    channelModel = conn
    channel = ch

    await ch.assertQueue(QUEUE_NAME, { durable: true })

    logger.info(`Connected to RabbitMQ, queue: ${QUEUE_NAME}`)

    conn.on('error', (err: unknown) => {
      logger.error('RabbitMQ connection error:', err)
    })

    conn.on('close', () => {
      logger.warn('RabbitMQ connection closed. Reconnecting...')
      setTimeout(connectRabbitMQ, 5000)
    })
  } catch (error) {
    logger.error('Failed to connect to RabbitMQ:', error)
    setTimeout(connectRabbitMQ, 5000)
  }
}

export const publishMessage = async (message: any): Promise<boolean> => {
  try {
    if (!channel) {
      logger.error('RabbitMQ channel not available')
      return false
    }

    const ch = channel
    const messageBuffer = Buffer.from(JSON.stringify(message))

    const ok = ch.sendToQueue(QUEUE_NAME, messageBuffer, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    })

    logger.debug('Message published to queue', { message, ok })
    return ok
  } catch (error) {
    logger.error('Failed to publish message:', error)
    return false
  }
}

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    const ch = channel
    const conn = channelModel

    // zera primeiro
    channel = null
    channelModel = null

    if (ch) await ch.close()
    if (conn) await conn.close()

    logger.info('RabbitMQ connection closed')
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error)
  }
}
