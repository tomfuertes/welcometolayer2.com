import { createClient, SocketClosedUnexpectedlyError } from "redis";

const log = console.log.bind(console, "redis:");

type RedisOpts = {
  url?: string;
  socket?: {
    tls: boolean;
    rejectUnauthorized: boolean;
  };
};

const redisOpts: RedisOpts = {};

if (
  process.env.REDIS_TLS_URL ||
  /^rediss/.test(process.env.REDIS_URL as string)
) {
  redisOpts.url = process.env.REDIS_TLS_URL || process.env.REDIS_URL;
  redisOpts.socket = {
    tls: true,
    rejectUnauthorized: false,
  };
}

const redis = createClient(redisOpts);
// DO NOT DELETE THESE LINES THEY ARE CRITICAL: https://github.com/redis/node-redis/issues/2032
redis.on("error", (err) => {
  if (err instanceof SocketClosedUnexpectedlyError) {
    // ignore
  } else {
    log("redis error", err);
  }
});
redis.on("connect", () => log("redis is connect"));
redis.on("reconnecting", () => log("redis is reconnecting"));
redis.on("ready", () => log("redis is ready"));
// END DO NOT DELETE
redis.connect();

export default redis;
