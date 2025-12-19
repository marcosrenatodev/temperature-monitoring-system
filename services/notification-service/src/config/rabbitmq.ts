import amqp, { type Channel, type ChannelModel, type ConsumeMessage } from 'amqplib'
import { logger } from './logger'

let channelModel: ChannelModel | null = null
let channel: Channel | null = null

const RABBITMQ_URL = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`
const QUEUE_NAME = process.env.RABBITMQ_QUEUE_SENSOR_DATA || 'sensor_data'

export const connectRabbitMQ = async (): Promise<void> => {
  try {
    const conn = await amqp.connect(RABBITMQ_URL) // ✅ ChannelModel (conforme @types/amqplib)
    const ch = await conn.createChannel()

    channelModel = conn
    channel = ch

    await ch.assertQueue(QUEUE_NAME, { durable: true })
    await ch.prefetch(1)

    logger.info(`Connected to RabbitMQ, queue: ${QUEUE_NAME}`)

    // Events no ChannelModel
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

export const consumeMessages = async (
  callback: (message: any) => Promise<void>
): Promise<void> => {
  try {
    if (!channel) throw new Error('RabbitMQ channel not available')

    const ch = channel

    await ch.consume(
      QUEUE_NAME,
      async (msg: ConsumeMessage | null) => {
        if (!msg) return

        try {
          const payload = JSON.parse(msg.content.toString())
          logger.info('Message received from queue', { payload })

          await callback(payload)

          ch.ack(msg)
          logger.debug('Message acknowledged')
        } catch (error) {
          logger.error('Error processing message:', error)
          ch.nack(msg, false, false)
        }
      },
      { noAck: false }
    )

    logger.info('Started consuming messages from queue')
  } catch (error) {
    logger.error('Failed to start consuming messages:', error)
    throw error
  }
}

export const closeRabbitMQ = async (): Promise<void> => {
  try {
    const ch = channel
    const conn = channelModel

    // zera primeiro pra evitar reuso em shutdown parcial
    channel = null
    channelModel = null

    if (ch) await ch.close()
    if (conn) await conn.close()

    logger.info('RabbitMQ connection closed')
  } catch (error) {
    logger.error('Error closing RabbitMQ connection:', error)
  }
}

