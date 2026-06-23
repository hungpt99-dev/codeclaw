import { createApp, getDefaultDbPath, getDefaultPromptsDir } from "@aiteam/server";

async function start(): Promise<void> {
  const app = createApp({
    dbPath: getDefaultDbPath(),
    promptsDir: getDefaultPromptsDir(),
  });

  const port = parseInt(process.env.PORT ?? "4317", 10);
  const host = process.env.HOST ?? "127.0.0.1";

  try {
    await app.listen({ port, host });
    console.log(`Local server running at http://${host}:${String(port)}`);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

void start();
