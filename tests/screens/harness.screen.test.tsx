// @vitest-environment jsdom
// Smoke test: proves the jsdom + React Testing Library + jest-dom harness works.
// Screen-level component specs (added Session 11) live alongside this under
// tests/screens/ and use the same `// @vitest-environment jsdom` pragma.
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/kit/button";

describe("screen test harness", () => {
  it("renders a kit component into jsdom", () => {
    render(<Button>Save Product</Button>);
    expect(screen.getByRole("button", { name: "Save Product" })).toBeInTheDocument();
  });
});
