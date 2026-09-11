import { serve } from "@hono/node-server";
import { seedPraiNabDeskFixtures } from "@wombat/store";
import { createWorkerAdapters, createWorkerStore } from "@wombat/worker";
import { createApi } from "./app.js";

const { store } = createWorkerStore();
if (!process.env.DATABASE_URL) {
  await seedPraiNabDeskFixtures(store);
}
const { crm } = createWorkerAdapters();
const app = createApi(store, crm);
const port = Number(process.env.API_PORT ?? 3000);
const hostname = process.env.API_HOST ?? "127.0.0.1";

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.info(`brokerage-services api listening on http://${info.address}:${info.port}`);
});
