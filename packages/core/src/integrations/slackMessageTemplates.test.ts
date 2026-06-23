import { describe, it, expect } from "vitest";
import {
  buildWorkflowStartedMessage,
  buildDocsGeneratedMessage,
  buildCodeGeneratedMessage,
  buildTestResultMessage,
  buildReportReadyMessage,
} from "./slackMessageTemplates.js";
import type { SlackMessageInput } from "./slackMessageTemplates.js";

const baseInput: SlackMessageInput = {
  runTitle: "Test run",
  runId: "run_123",
  status: "REPORT_GENERATED",
};

describe("slackMessageTemplates", () => {
  describe("buildWorkflowStartedMessage", () => {
    it("includes run title and run ID", () => {
      const result = buildWorkflowStartedMessage(baseInput);
      expect(result).toContain("Test run");
      expect(result).toContain("run_123");
    });
  });

  describe("buildDocsGeneratedMessage", () => {
    it("includes artifact list", () => {
      const result = buildDocsGeneratedMessage(baseInput);
      expect(result).toContain("Clarified Requirement");
      expect(result).toContain("Technical Design");
      expect(result).toContain("Test Matrix");
    });
  });

  describe("buildCodeGeneratedMessage", () => {
    it("includes changed files when provided", () => {
      const input: SlackMessageInput = {
        ...baseInput,
        changedFiles: ["src/test.ts", "src/main.ts"],
      };
      const result = buildCodeGeneratedMessage(input);
      expect(result).toContain("src/test.ts");
      expect(result).toContain("src/main.ts");
    });

    it("works without changed files", () => {
      const result = buildCodeGeneratedMessage(baseInput);
      expect(result).toContain("Code generation has completed");
    });
  });

  describe("buildTestResultMessage", () => {
    it("shows passed status", () => {
      const input: SlackMessageInput = { ...baseInput, status: "TEST_PASSED" };
      const result = buildTestResultMessage(input);
      expect(result).toContain("Tests Passed");
    });

    it("shows failed status", () => {
      const input: SlackMessageInput = { ...baseInput, status: "TEST_FAILED" };
      const result = buildTestResultMessage(input);
      expect(result).toContain("Tests Failed");
    });

    it("includes test result when provided", () => {
      const input: SlackMessageInput = { ...baseInput, testResult: "3 passed, 1 failed" };
      const result = buildTestResultMessage(input);
      expect(result).toContain("3 passed, 1 failed");
    });
  });

  describe("buildReportReadyMessage", () => {
    it("includes run title and run ID", () => {
      const result = buildReportReadyMessage(baseInput);
      expect(result).toContain("Test run");
      expect(result).toContain("run_123");
    });

    it("includes artifact summary when provided", () => {
      const input: SlackMessageInput = { ...baseInput, artifactSummary: "All artifacts generated" };
      const result = buildReportReadyMessage(input);
      expect(result).toContain("All artifacts generated");
    });

    it("includes the view link", () => {
      const result = buildReportReadyMessage(baseInput);
      expect(result).toContain("localhost:4317");
      expect(result).toContain("run_123");
    });
  });
});
