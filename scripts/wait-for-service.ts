import { setTimeout as delay } from 'node:timers/promises';

const url = process.argv[2];
const timeoutMs = Number(process.argv[3] ?? 120_000);
const intervalMs = Number(process.argv[4] ?? 5_000);

if (!url) {
  console.error('Usage: ts-node wait-for-service.ts <url> [timeoutMs] [intervalMs]');
  process.exit(1);
}

const start = Date.now();

async function check(): Promise<void> {
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        console.log(`Service at ${url} is reachable (status ${response.status}).`);
        return;
      }
      console.warn(`Received status ${response.status} from ${url}. Retrying in ${intervalMs}ms.`);
    } catch (error) {
      console.warn(`Failed to reach ${url}: ${(error as Error).message}. Retrying in ${intervalMs}ms.`);
    }

    await delay(intervalMs);
  }

  console.error(`Service at ${url} did not become ready within ${timeoutMs}ms.`);
  process.exit(2);
}

check().catch((error) => {
  console.error(`Unexpected error while waiting for ${url}:`, error);
  process.exit(3);
});
