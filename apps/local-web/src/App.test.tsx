import { describe, it, expect } from "vitest";
import { App } from "./App.js";
import { render, screen } from "@testing-library/react";

describe("App", () => {
  it("renders a run ID", () => {
    render(<App />);
    expect(screen.getByText(/Run ID:/)).toBeDefined();
  });
});
