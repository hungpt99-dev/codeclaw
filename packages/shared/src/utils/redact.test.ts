import { describe, it, expect } from "vitest";
import { redactSecrets } from "./redact.js";

describe("redactSecrets", () => {
  it("redacts API keys", () => {
    const input = "api_key=sk-1234567890abcdef";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("sk-1234567890abcdef");
  });

  it("redacts bearer tokens", () => {
    const input = "Authorization: bearer eyJhbGciOiJIUzI1NiJ9.token";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("eyJhbGciOiJIUzI1NiJ9.token");
  });

  it("redacts Slack tokens", () => {
    const input = "xoxb-1234567890-abcdefghijklmnopqrst";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("xoxb-1234567890-abcdefghijklmnopqrst");
  });

  it("redacts database URLs with passwords", () => {
    const input = "postgres://user:secretpassword@localhost:5432/db";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("secretpassword");
  });

  it("does not modify safe text", () => {
    const input = "Hello, this is a normal log message without secrets.";
    const result = redactSecrets(input);
    expect(result).toBe(input);
  });

  it("redacts multiple secrets in one string", () => {
    const input = "API_KEY=abc123 and token=xyz789";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("abc123");
    expect(result).not.toContain("xyz789");
  });

  it("redacts session tokens", () => {
    const input = "session_token=abc123def456";
    const result = redactSecrets(input);
    expect(result).toContain("[REDACTED]");
    expect(result).not.toContain("abc123def456");
  });
});
