import { describe, it, expect } from "vitest";
import { App } from "./App.js";
import { render, screen } from "@testing-library/react";

describe("App", () => {
  it("renders the dashboard heading", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeDefined();
  });
});
