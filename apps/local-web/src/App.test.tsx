import { describe, it, expect } from "vitest";
import { App } from "./App.js";
import { render, screen } from "@testing-library/react";

describe("App", () => {
  it("renders greeting", () => {
    render(<App />);
    expect(screen.getByText("Hello, Team!")).toBeDefined();
  });
});
