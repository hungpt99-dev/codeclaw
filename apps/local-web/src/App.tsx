import { greet } from "@aiteam/shared";

import type { ReactElement } from "react";

export function App(): ReactElement {
  return <h1>{greet("Team")}</h1>;
}
