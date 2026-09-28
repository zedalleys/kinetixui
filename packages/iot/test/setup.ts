import "@testing-library/jest-dom/vitest";

// This module's primitives render plain elements and read no layout, so jsdom needs no
// patching beyond the matchers. If that changes, mirror packages/ui/test/setup.ts rather
// than growing a second set of stubs here.
