import type { AppDataStore } from "./store";
import { memoryDataStore } from "./memory-store";

export async function getDataStore(): Promise<AppDataStore> {
  if (process.env.DATABASE_URL) {
    const { prismaDataStore } = await import("./prisma-store");
    return prismaDataStore;
  }

  return memoryDataStore;
}
