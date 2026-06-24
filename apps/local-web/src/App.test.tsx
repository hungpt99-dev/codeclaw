import { describe, it, expect } from "vitest";
import { App } from "./App.js";
import { render, screen } from "@testing-library/react";

describe("App", () => {
  it("renders the dashboard heading", () => {
    render(<App />);
    const headings = screen.getAllByRole("heading");
    expect(headings.some((h) => h.textContent === "Dashboard")).toBe(true);
  });

  it("renders navigation links", () => {
    render(<App />);
    const newReqLinks = screen.getAllByText("New Requirement");
    expect(newReqLinks.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Integrations").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Prompt Templates").length).toBeGreaterThanOrEqual(1);
  });
});
