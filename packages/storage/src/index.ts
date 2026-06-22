export function createStore(): { get: () => string } {
  return { get: () => "store" };
}
