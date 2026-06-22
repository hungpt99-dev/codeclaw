export function createAdapter(): { connect: () => string } {
  return { connect: () => "connected" };
}
