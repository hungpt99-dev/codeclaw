import { describe, it, expect } from "vitest";
import {
  parseRequirementId,
  parseAcceptanceCriteria,
  parseTaskBreakdown,
  parseTestMatrix,
} from "./traceabilityParser.js";

describe("traceabilityParser", () => {
  describe("parseRequirementId", () => {
    it("extracts REQ ID from markdown table", () => {
      const content = `
| ID     | Description               |
|--------|---------------------------|
| REQ-001 | User can export invoices |
`;
      const result = parseRequirementId(content);
      expect(result).toEqual({ id: "REQ-001", text: "User can export invoices" });
    });

    it("extracts REQ ID from inline pattern", () => {
      const content = `**ID**: REQ-001\n**Text**: User can export invoices by hotelId`;
      const result = parseRequirementId(content);
      expect(result).toEqual({
        id: "REQ-001",
        text: "User can export invoices by hotelId",
      });
    });

    it("returns null when no requirement ID found", () => {
      const result = parseRequirementId("No requirement IDs here");
      expect(result).toBeNull();
    });
  });

  describe("parseAcceptanceCriteria", () => {
    it("extracts AC IDs from markdown table", () => {
      const content = `
| ID     | Criteria                          |
|--------|-----------------------------------|
| AC-001 | User can export by hotel ID       |
| AC-002 | User can filter by date range     |
`;
      const results = parseAcceptanceCriteria(content);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: "AC-001",
        text: "User can export by hotel ID",
      });
      expect(results[1]).toEqual({
        id: "AC-002",
        text: "User can filter by date range",
      });
    });

    it("returns empty array when no AC IDs found", () => {
      const results = parseAcceptanceCriteria("No criteria here");
      expect(results).toEqual([]);
    });
  });

  describe("parseTaskBreakdown", () => {
    it("extracts TASK IDs from markdown table", () => {
      const content = `
| ID       | Title                        |
|----------|------------------------------|
| TASK-001 | Implement export API endpoint |
| TASK-002 | Add query filters            |
`;
      const results = parseTaskBreakdown(content);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: "TASK-001",
        title: "Implement export API endpoint",
      });
      expect(results[1]).toEqual({
        id: "TASK-002",
        title: "Add query filters",
      });
    });
  });

  describe("parseTestMatrix", () => {
    it("extracts TC IDs from markdown table", () => {
      const content = `
| ID     | Scenario                  |
|--------|---------------------------|
| TC-001 | Export with valid hotelId |
| TC-002 | Export with invalid date  |
`;
      const results = parseTestMatrix(content);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: "TC-001",
        scenario: "Export with valid hotelId",
      });
      expect(results[1]).toEqual({
        id: "TC-002",
        scenario: "Export with invalid date",
      });
    });

    it("handles table with extra columns", () => {
      const content = `
| ID     | Scenario                  | Type | Priority |
|--------|---------------------------|------|----------|
| TC-001 | Export with valid hotelId | Unit | High     |
`;
      const results = parseTestMatrix(content);
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("TC-001");
    });

    it("returns empty array when no TC IDs found", () => {
      const results = parseTestMatrix("No test cases");
      expect(results).toEqual([]);
    });
  });
});
