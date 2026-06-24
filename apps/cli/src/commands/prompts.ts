import { access, readFile, readdir, cp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATES_DIR = join(__dirname, "..", "..", "..", "..", "..", "templates", "prompts");

export async function promptsListCommand(): Promise<void> {
  const promptsDir = await ensurePrompts();
  const files = await readdir(promptsDir);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

  console.log("\n📝 Available prompt templates:\n");
  for (const file of mdFiles) {
    const name = file.replace(/\.md$/, "");
    console.log(`  ${name}`);
  }
  console.log(`\n  Total: ${String(mdFiles.length)} templates\n`);
}

export async function promptsShowCommand(name: string): Promise<void> {
  const promptsDir = await ensurePrompts();
  const filePath = join(promptsDir, `${name}.md`);

  try {
    await access(filePath);
  } catch {
    console.log(`\n❌ Template not found: ${name}\n`);
    process.exit(1);
  }

  const content = await readFile(filePath, "utf-8");
  console.log(`\n📝 Template: ${name}\n`);
  console.log(content);
  if (!content.endsWith("\n")) console.log("");
}

export async function promptsEditCommand(name: string): Promise<void> {
  const promptsDir = await ensurePrompts();
  const filePath = join(promptsDir, `${name}.md`);

  try {
    await access(filePath);
  } catch {
    console.log(`\n❌ Template not found: ${name}\n`);
    process.exit(1);
  }

  const editor = process.env.EDITOR ?? "vi";

  console.log(`\n📝 Opening ${name} in ${editor}...\n`);

  try {
    execSync(`${editor} "${filePath}"`, { stdio: "inherit" });
    console.log(`\n✅ Template saved: ${name}\n`);
  } catch {
    console.log(`\n⚠️  Editor closed or failed to save.\n`);
  }
}

export async function promptsResetCommand(name: string): Promise<void> {
  const promptsDir = await ensurePrompts();
  const destPath = join(promptsDir, `${name}.md`);

  const sourcePath = join(TEMPLATES_DIR, `${name}.md`);
  try {
    await access(sourcePath);
  } catch {
    console.log(`\n❌ Default template not found: ${name}\n`);
    process.exit(1);
  }

  await cp(sourcePath, destPath);
  console.log(`\n✅ Reset template: ${name}\n`);
}

export async function promptsValidateCommand(): Promise<void> {
  const promptsDir = await ensurePrompts();
  const files = await readdir(promptsDir);
  const mdFiles = files.filter((f) => f.endsWith(".md")).sort();

  console.log("\n🔍 Validating prompt templates...\n");

  let validCount = 0;
  let issueCount = 0;

  for (const file of mdFiles) {
    const content = await readFile(join(promptsDir, file), "utf-8");
    const vars: string[] = [];
    const localPattern = /\{\{(\w+)\}\}/g;
    let execMatch: RegExpExecArray | null;
    while ((execMatch = localPattern.exec(content)) !== null) {
      const varName = execMatch[1];
      if (varName !== undefined) {
        vars.push(varName);
      }
    }

    const malformed = content.match(/\{\{[^}]*$/gm);
    if (malformed && malformed.length > 0) {
      console.log(`  ⚠️  ${file}: ${String(malformed.length)} malformed variable(s)`);
      issueCount++;
      continue;
    }

    const unique = [...new Set(vars)];
    if (unique.length > 0) {
      console.log(`  ✅ ${file}: ${unique.join(", ")}`);
    } else {
      console.log(`  ✅ ${file}: (no variables)`);
    }
    validCount++;
  }

  console.log(`\n  Result: ${String(validCount)} valid, ${String(issueCount)} with issues\n`);
}

async function ensurePrompts(): Promise<string> {
  const aiTeamDir = join(process.cwd(), ".codeclaw");
  try {
    await access(aiTeamDir);
  } catch {
    console.log("❌ .codeclaw not found. Run 'codeclaw init' first.");
    process.exit(1);
  }
  const promptsDir = join(aiTeamDir, "prompts");
  try {
    await access(promptsDir);
  } catch {
    console.log("❌ prompts directory not found. Run 'codeclaw init' first.");
    process.exit(1);
  }
  return promptsDir;
}
