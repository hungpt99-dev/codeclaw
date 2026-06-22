import { createRunId } from "@aiteam/shared";

import type { ReactElement } from "react";

export function App(): ReactElement {
  return <h1>Run ID: {createRunId("Team")}</h1>;
}
