export type DoctorCheckStatus = "ok" | "warning" | "error" | "info" | "unknown";

export interface DoctorCheck {
  name: string;
  status: DoctorCheckStatus;
  message: string;
  recommendation: string | undefined;
}

export interface DoctorStatus {
  project: {
    status: DoctorCheckStatus;
    name: string | null;
    rootPath: string | null;
    pathExists: boolean;
    codeclawDirExists: boolean;
    checks: DoctorCheck[];
  };
  storage: {
    status: DoctorCheckStatus;
    databaseAccessible: boolean;
    totalRuns: number;
    checks: DoctorCheck[];
  };
  providers: {
    status: DoctorCheckStatus;
    provider: string;
    model: string | null;
    apiKeyEnv: string | null;
    configured: boolean;
    checks: DoctorCheck[];
  };
  adapters: {
    status: DoctorCheckStatus;
    items: {
      name: string;
      key: string;
      available: boolean;
      enabled: boolean;
      command: string;
    }[];
    checks: DoctorCheck[];
  };
  nativeRunner: {
    status: DoctorCheckStatus;
    available: boolean;
    version: string | null;
    checks: DoctorCheck[];
  };
  security: {
    status: DoctorCheckStatus;
    secretsExposed: boolean;
    envVarNames: string[];
    checks: DoctorCheck[];
  };
  recommendations: string[];
}
