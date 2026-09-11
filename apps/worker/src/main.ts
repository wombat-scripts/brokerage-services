import { processQueuedJobs } from "./processor.js";
import { createWorkerAdapters, createWorkerStore } from "./runtime.js";

const pollMs = Number(process.env.WORKER_POLL_MS ?? 1000);
const { store, close } = createWorkerStore();
const { crm } = createWorkerAdapters();

console.info("brokerage-services worker started", {
  store: process.env.DATABASE_URL ? "postgres" : "memory",
  fixtures: process.env.PHASE1_FIXTURES === "true",
  firmId: process.env.FIRM_ID ?? "wombat",
});

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});

while (!stopping) {
  await processQueuedJobs(store, crm);
  await new Promise((resolve) => setTimeout(resolve, pollMs));
}

await close?.();
