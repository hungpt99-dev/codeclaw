mod errors;
mod types;
mod policy;
mod redaction;
mod git;
mod command;

use std::io::{self, Read};
use types::{RunnerRequest, RunnerResponse, RunnerError};

fn main() {
    let mut input = String::new();
    if let Err(e) = io::stdin().read_to_string(&mut input) {
        let response = RunnerResponse {
            success: false,
            action: "unknown".to_string(),
            exit_code: None,
            stdout: None,
            stderr: None,
            started_at: chrono::Utc::now().to_rfc3339(),
            ended_at: chrono::Utc::now().to_rfc3339(),
            duration_ms: 0,
            timed_out: None,
            cancelled: None,
            redacted: false,
            error: Some(RunnerError::new("STDIN_ERROR", &format!("Failed to read stdin: {}", e))),
        };
        let _ = serde_json::to_writer(io::stdout(), &response);
        return;
    }

    let request: RunnerRequest = match serde_json::from_str(&input) {
        Ok(req) => req,
        Err(e) => {
            let response = RunnerResponse {
                success: false,
                action: "unknown".to_string(),
                exit_code: None,
                stdout: None,
                stderr: None,
                started_at: chrono::Utc::now().to_rfc3339(),
                ended_at: chrono::Utc::now().to_rfc3339(),
                duration_ms: 0,
                timed_out: None,
                cancelled: None,
                redacted: false,
                error: Some(RunnerError::new("PARSE_ERROR", &format!("Failed to parse request: {}", e))),
            };
            let _ = serde_json::to_writer(io::stdout(), &response);
            return;
        }
    };

    let response = match &request {
        RunnerRequest::RunCommand(req) => {
            command::run_command(req)
        }
        RunnerRequest::GitStatus(req) => {
            git::git_status(&req.cwd, req.timeout_ms.unwrap_or(30000), redaction::should_redact(req.redact_secrets))
        }
        RunnerRequest::GitDiff(req) => {
            git::git_diff(&req.cwd, req.timeout_ms.unwrap_or(30000), redaction::should_redact(req.redact_secrets), req.staged.unwrap_or(false))
        }
    };

    let _ = serde_json::to_writer(io::stdout(), &response);
}
