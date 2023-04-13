import { CacheContainer } from "node-ts-cache";
import { MemoryStorage } from "node-ts-cache-storage-memory";

export { Cache } from "node-ts-cache";

export const memoryCache = new CacheContainer(new MemoryStorage());
