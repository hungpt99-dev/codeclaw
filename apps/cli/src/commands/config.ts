import { access, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { configSchema } from "@aiteam/shared";

export async function configListCommand(): Promise<void> {
  const configPath = await ensureConfig();
  const raw = await readFile(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  console.log("\n⚙️  Configuration\n");
  printObject(parsed, "  ");
  console.log("");
}

export async function configGetCommand(key: string): Promise<void> {
  const configPath = await ensureConfig();
  const raw = await readFile(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const value = resolveDotNotation(parsed, key);
  if (value === undefined) {
    console.log(`\n❌ Key not found: ${key}\n`);
    process.exit(1);
  }
  console.log(`\n  ${key}: ${JSON.stringify(value, null, 2)}\n`);
}

export async function configSetCommand(key: string, value: string): Promise<void> {
  const configPath = await ensureConfig();
  const raw = await readFile(configPath, "utf-8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const parsedValue = tryParseValue(value);
  setDotNotation(parsed, key, parsedValue);

  await writeFile(configPath, JSON.stringify(parsed, null, 2), "utf-8");
  console.log(`\n✅ Set ${key} = ${JSON.stringify(parsedValue)}\n`);
}

export async function configValidateCommand(): Promise<void> {
  const configPath = await ensureConfig();

  try {
    const raw = await readFile(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    configSchema.parse(parsed);
    console.log("\n✅ Configuration is valid.\n");
  } catch (e) {
    console.log(`\n❌ Invalid configuration: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
}

export async function configPathCommand(): Promise<void> {
  const aiTeamDir = join(process.cwd(), ".ai-team");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }
  console.log(`\n  ${join(aiTeamDir, "config.json")}\n`);
}

async function ensureConfig(): Promise<string> {
  const aiTeamDir = join(process.cwd(), ".ai-team");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .ai-team not found. Run 'aiteam init' first.");
    process.exit(1);
  }
  const configPath = join(aiTeamDir, "config.json");
  try {
    await access(configPath);
  } catch {
    console.log("❌ config.json not found. Run 'aiteam init' first.");
    process.exit(1);
  }
  return configPath;
}

function resolveDotNotation(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setDotNotation(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = String(keys[i]);
    if (!(key in current) || typeof current[key] !== "object" || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  const lastKey = String(keys[keys.length - 1]);
  current[lastKey] = value;
}

function tryParseValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (value === "undefined") return undefined;
  const num = Number(value);
  if (!Number.isNaN(num) && value.trim() !== "") return num;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function printObject(obj: Record<string, unknown>, indent: string): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      console.log(`${indent}${key}:`);
      printObject(value as Record<string, unknown>, `${indent}  `);
    } else {
      console.log(`${indent}${key}: ${JSON.stringify(value)}`);
    }
  }
}
