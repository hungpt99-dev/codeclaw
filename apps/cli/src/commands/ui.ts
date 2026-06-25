import { access } from "node:fs/promises";
import { join } from "node:path";
import { resolveProjectContext } from "@codeclaw/core";
import { createApp } from "@codeclaw/server";

interface UiOptions {
  host?: string;
  port?: string;
  open?: boolean;
}

export async function uiCommand(options: UiOptions): Promise<void> {
  const host = options.host ?? "127.0.0.1";
  const port = parseInt(options.port ?? "4317", 10);

  // Resolve project context for per-project database
  let projectContext;
  try {
    projectContext = await resolveProjectContext();
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }

  const aiTeamDir = join(projectContext.projectRoot, ".codeclaw");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }

  const app = createApp({
    dbPath: projectContext.databasePath,
    promptsDir: join(aiTeamDir, "prompts"),
    dataDir: aiTeamDir,
  });

  try {
    await app.listen({ port, host });
    console.log(`\n✅ CodeClaw UI is running.`);
    if (projectContext.projectName) {
      console.log(`   Project: ${projectContext.projectName}`);
    }
    console.log(`   Database: ${projectContext.databasePath}`);
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

    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
      console.log("\nShutting down...");
      await app.close();
      process.exit(0);
    };
    process.on("SIGINT", () => {
      void shutdown();
    });
    process.on("SIGTERM", () => {
      void shutdown();
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("EADDRINUSE")) {
      console.log(
        `❌ Port ${String(port)} is already in use. Try: codeclaw ui --port ${String(port + 1)}`,
      );
    } else {
      console.log("❌ Failed to start server:", message);
    }
    process.exit(1);
  }
}
