import dotenv from "dotenv";

dotenv.config();

export default {
    nodeEnv: process.env.NODE_ENV || "development",
    upgradeApiKey: process.env.UPGRADE_API_KEY || "development",
    port: process.env.PORT || 8080,
  //  corsEnabled: process.env.CORS_ENABLED || "true",
  //  apiPrefix: process.env.API_PREFIX || "api",
 //   appUrl: process.env.APP_URL || "http://localhost:3000",
//appSecret: process.env.APP_SECRET || "DEFAULT_SECRET",

    // MongoDB configuration
 //   mongoUri: process.env.MONGO_URI || "mongodb://mongodb1:27017,mongodb2:27018,mongodb3:27019/?replicaSet=myReplicaSet",
    // Redis cache configuration
 //   redisCacheHost: process.env.REDIS_CACHE_HOST || "redis-cache",
 //   redisCachePort: Number(process.env.REDIS_CACHE_PORT) || 6379,
//redisCachePassword: process.env.REDIS_CACHE_PASSWORD || "development",

    // Redis session configuration
  //  redisSessionHost: process.env.REDIS_SESSION_HOST || "redis-session",
 //   redisSessionPort: Number(process.env.REDIS_SESSION_PORT) || 6379,
 //   redisSessionPassword: process.env.REDIS_SESSION_PASSWORD || "development",

    // RedisInsight configuration
 //   redisInsightPort: Number(process.env.REDISINSIGHT_PORT) || 8001,

    // MeiliSearch configuration
//meiliSearchHost: process.env.MEILI_SEARCH_HOST || "http://meilisearch:7700",
  //  meiliSearchApiKey: process.env.MEILI_SEARCH_API_KEY || "masterKey",

    // RabbitMQ configuration
  //  rabbitMqHost: process.env.RABBITMQ_HOST || "rabbitmq",
  //  rabbitMqPort: Number(process.env.RABBITMQ_PORT) || 5672,
  //  rabbitMqUsername: process.env.RABBITMQ_USERNAME || "development",
//rabbitMqPassword: process.env.RABBITMQ_PASSWORD || "development",
};