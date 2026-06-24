import { access } from "node:fs/promises";
import { join } from "node:path";
import { createApp, getDefaultDbPath, getDefaultPromptsDir } from "@codeclaw/server";

interface UiOptions {
  host?: string;
  port?: string;
  open?: boolean;
}

export async function uiCommand(options: UiOptions): Promise<void> {
  const host = options.host ?? "127.0.0.1";
  const port = parseInt(options.port ?? "4317", 10);

  const aiTeamDir = join(process.cwd(), ".codeclaw");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }

  const app = createApp({
    dbPath: getDefaultDbPath(),
    promptsDir: getDefaultPromptsDir(),
  });

  try {
    await app.listen({ port, host });
    console.log(`\n✅ CodeClaw UI is running.`);
    console.log(`   URL: http://${host}:${String(port)}`);
    console.log("");

    if (options.open) {
      const url = `http://${host}:${String(port)}`;
      const { exec } = await import("node:child_process");
      const platform = process.platform;
      const cmd =
        platform === "darwin"
          ? `open "${url}"`
          : platform === "win32"
            ? `start "" "${url}"`
            : `xdg-open "${url}"`;
      exec(cmd, (err) => {
        if (err) {
          console.log("⚠️  Failed to open browser:", err.message);
        }
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("EADDRINUSE")) {
      console.log(`❌ Port ${String(port)} is already in use.`);
    } else {
      console.log("❌ Failed to start server:", message);
    }
    process.exit(1);
  }
}
