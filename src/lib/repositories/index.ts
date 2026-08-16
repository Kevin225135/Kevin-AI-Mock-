import type { AppDataStore } from "./store";

export async function getDataStore(): Promise<AppDataStore> {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Configure PostgreSQL, then run `npm run db:deploy` and `npm run db:seed`."
    );
  }

  if (!/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
  }

  const { prismaDataStore } = await import("./prisma-store");
  return prismaDataStore;
}
