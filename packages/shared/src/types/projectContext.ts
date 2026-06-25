export interface ProjectContext {
  projectId: string | undefined;
  projectName: string | undefined;
  projectRoot: string;
  dataDir: string;
  configPath: string;
  databasePath: string;
  runsDir: string;
  artifactsDir: string;
  memoryDir: string;
  exportsDir: string;
  logsDir: string;
  workflowTemplatesDir: string;
  resolvedVia: "explicit" | "active" | "cwd" | "legacy";
}
