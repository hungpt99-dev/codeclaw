import { describe, it, expect } from "vitest";
import { checkFileSafety, checkCommandSafety, defaultSafetyPolicy } from "./safetyPolicy.js";

describe("checkFileSafety", () => {
  const policy = defaultSafetyPolicy();

  it("blocks deny-listed files", () => {
    const result = checkFileSafety([".env", "src/main.ts"], policy);
    expect(result.blocked).toContain(".env");
    expect(result.safe).toContain("src/main.ts");
  });

  it("warns on warn-listed files", () => {
    const result = checkFileSafety(["package.json", "README.md"], policy);
    expect(result.warnings).toContain("package.json");
    expect(result.safe).toContain("README.md");
  });

  it("returns empty results for no files", () => {
    const result = checkFileSafety([], policy);
    expect(result.blocked).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
    expect(result.safe).toHaveLength(0);
  });

  it("categorizes multiple files correctly", () => {
    const files = [".env", "src/controller.ts", "package.json", "credentials.json", "README.md"];
    const result = checkFileSafety(files, policy);
    expect(result.blocked).toEqual([".env", "credentials.json"]);
    expect(result.warnings).toEqual(["package.json"]);
    expect(result.safe).toEqual(["src/controller.ts", "README.md"]);
  });
});

describe("checkCommandSafety", () => {
  const denyCommands = ["sudo", "rm -rf /", "chmod 777"];

  it("allows safe commands", () => {
    expect(checkCommandSafety("npm test", denyCommands)).toBe(true);
    expect(checkCommandSafety("git status", denyCommands)).toBe(true);
  });

  it("blocks dangerous commands", () => {
    expect(checkCommandSafety("sudo rm -rf /", denyCommands)).toBe(false);
    expect(checkCommandSafety("chmod 777 file", denyCommands)).toBe(false);
    expect(checkCommandSafety("rm -rf /", denyCommands)).toBe(false);
  });
});

describe("defaultSafetyPolicy", () => {
  it("returns a valid policy", () => {
    const policy = defaultSafetyPolicy();
    expect(policy.denyFiles).toContain(".env");
    expect(policy.warnFiles).toContain("pom.xml");
    expect(policy.denyCommands).toContain("sudo");
    expect(policy.maxIterations).toBe(3);
    expect(policy.commandTimeoutSeconds).toBe(900);
  });
});
