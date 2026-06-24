use std::process::Command;
use std::time::Instant;
use chrono::Utc;
use crate::types::{RunnerResponse, RunnerError};
use crate::redaction;

pub fn git_status(cwd: &str, timeout_ms: u64, do_redact: bool) -> RunnerResponse {
    let started_at = Utc::now().to_rfc3339();
    let start = Instant::now();

    let mut cmd = Command::new("git");
    cmd.args(["status", "--porcelain"]);
    cmd.current_dir(cwd);

    let result = run_command_with_timeout(&mut cmd, timeout_ms);

    let ended_at = Utc::now().to_rfc3339();
    let duration_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let (out, err) = if do_redact {
                (redaction::redact_output(&stdout), redaction::redact_output(&stderr))
            } else {
                (stdout, stderr)
            };

            RunnerResponse {
                success: output.status.success(),
                action: "git-status".to_string(),
                exit_code: output.status.code(),
                stdout: Some(out),
                stderr: Some(err),
                started_at,
                ended_at,
                duration_ms,
                timed_out: None,
                cancelled: None,
                redacted: do_redact,
                error: None,
            }
        }
        Err(e) => RunnerResponse {
            success: false,
            action: "git-status".to_string(),
            exit_code: None,
            stdout: None,
            stderr: None,
            started_at,
            ended_at,
            duration_ms,
            timed_out: None,
            cancelled: None,
            redacted: do_redact,
            error: Some(RunnerError::new("EXECUTION_ERROR", &e)),
        },
    }
}

pub fn git_diff(cwd: &str, timeout_ms: u64, do_redact: bool, staged: bool) -> RunnerResponse {
    let started_at = Utc::now().to_rfc3339();
    let start = Instant::now();

    let mut cmd = Command::new("git");
    if staged {
        cmd.args(["diff", "--staged", "--patch"]);
    } else {
        cmd.args(["diff", "--patch"]);
    }
    cmd.current_dir(cwd);

    let result = run_command_with_timeout(&mut cmd, timeout_ms);

    let ended_at = Utc::now().to_rfc3339();
    let duration_ms = start.elapsed().as_millis() as u64;

    match result {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            let (out, err) = if do_redact {
                (redaction::redact_output(&stdout), redaction::redact_output(&stderr))
            } else {
                (stdout, stderr)
            };

            RunnerResponse {
                success: output.status.success(),
                action: "git-diff".to_string(),
                exit_code: output.status.code(),
                stdout: Some(out),
                stderr: Some(err),
                started_at,
                ended_at,
                duration_ms,
                timed_out: None,
                cancelled: None,
                redacted: do_redact,
                error: None,
            }
        }
        Err(e) => RunnerResponse {
            success: false,
            action: "git-diff".to_string(),
            exit_code: None,
            stdout: None,
            stderr: None,
            started_at,
            ended_at,
            duration_ms,
            timed_out: None,
            cancelled: None,
            redacted: do_redact,
            error: Some(RunnerError::new("EXECUTION_ERROR", &e)),
        },
    }
}

fn run_command_with_timeout(cmd: &mut Command, _timeout_ms: u64) -> Result<std::process::Output, String> {
    let child = cmd
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn process: {}", e))?;

    match child.wait_with_output() {
        Ok(output) => Ok(output),
        Err(e) => Err(format!("Process error: {}", e)),
    }
}
