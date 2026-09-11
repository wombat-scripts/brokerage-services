export function isFixtureMode(input: { fixture?: boolean }): boolean {
  return input.fixture === true || process.env.PHASE1_FIXTURES === "true";
}
