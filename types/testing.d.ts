// Makes the @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
// visible to tsc for the screen-level component specs under tests/screens/.
// vitest.setup.ts registers them at runtime via expect.extend.
import "@testing-library/jest-dom/vitest";
