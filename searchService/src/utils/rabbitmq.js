import { logger } from "./logger.js";
import amqp from "amqplib";

let connection = null;
let channel = null;
const EXCHANGE_NAME = "facebook_events";

async function connectToRabbitMq() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("connected to rabbit mq");

    return channel;
  } catch (error) {
    logger.error("Error connecting to rabbit mq", error.message);
  }
}

//A routing key is a string that defines where the message should go.
// It works only with direct and topic exchanges.

async function consumeEvent(routingKey, callback) {
  if (!channel) {
    await connectToRabbitMq();
  }

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });
  logger.info(`Subscribe to event : ${routingKey}`);
}

export { connectToRabbitMq, consumeEvent };
