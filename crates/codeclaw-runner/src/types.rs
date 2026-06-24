use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "action")]
pub enum RunnerRequest {
    #[serde(rename = "run-command")]
    RunCommand(RunCommandRequest),
    #[serde(rename = "git-status")]
    GitStatus(GitStatusRequest),
    #[serde(rename = "git-diff")]
    GitDiff(GitDiffRequest),
}

#[derive(Debug, Deserialize)]
pub struct RunCommandRequest {
    pub cwd: String,
    pub command: Option<String>,
    pub args: Option<Vec<String>>,
    pub timeout_ms: Option<u64>,
    pub env: Option<std::collections::HashMap<String, String>>,
    pub policy: Option<CommandPolicy>,
    pub capture_stdout: Option<bool>,
    pub capture_stderr: Option<bool>,
    pub redact_secrets: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct GitStatusRequest {
    pub cwd: String,
    pub timeout_ms: Option<u64>,
    pub redact_secrets: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct GitDiffRequest {
    pub cwd: String,
    pub timeout_ms: Option<u64>,
    pub redact_secrets: Option<bool>,
    pub staged: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct CommandPolicy {
    pub allow_commands: Option<Vec<String>>,
    pub deny_patterns: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct RunnerResponse {
    pub success: bool,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stdout: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stderr: Option<String>,
    pub started_at: String,
    pub ended_at: String,
    pub duration_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timed_out: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cancelled: Option<bool>,
    pub redacted: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<RunnerError>,
}

#[derive(Debug, Serialize)]
pub struct RunnerError {
    pub code: String,
    pub message: String,
}

impl RunnerError {
    pub fn new(code: &str, message: &str) -> Self {
        RunnerError {
            code: code.to_string(),
            message: message.to_string(),
        }
    }
}
