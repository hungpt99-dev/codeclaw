use std::process::{Command, Stdio};
use std::time::Instant;
use chrono::Utc;
use crate::types::{RunnerResponse, RunCommandRequest, RunnerError};
use crate::policy::check_command_policy;
use crate::redaction;

pub fn run_command(req: &RunCommandRequest) -> RunnerResponse {
    let started_at = Utc::now().to_rfc3339();
    let start = Instant::now();

    let command = req.command.clone().unwrap_or_default();
    let args = req.args.clone().unwrap_or_default();
    let timeout_ms = req.timeout_ms.unwrap_or(60000);
    let do_redact = redaction::should_redact(req.redact_secrets);

    if command.is_empty() {
        let ended_at = Utc::now().to_rfc3339();
        return RunnerResponse {
            success: false,
            action: "run-command".to_string(),
            exit_code: None,
            stdout: None,
            stderr: None,
            started_at,
            ended_at,
            duration_ms: 0,
            timed_out: None,
            cancelled: None,
            redacted: do_redact,
            error: Some(RunnerError::new("INVALID_REQUEST", "Command is empty")),
        };
    }

    if let Err(e) = check_command_policy(&command, &args, &req.policy) {
        let ended_at = Utc::now().to_rfc3339();
        return RunnerResponse {
            success: false,
            action: "run-command".to_string(),
            exit_code: None,
            stdout: None,
            stderr: None,
            started_at,
            ended_at,
            duration_ms: 0,
            timed_out: None,
            cancelled: None,
            redacted: do_redact,
            error: Some(RunnerError::new("POLICY_DENIED", &e)),
        };
    }

    let mut cmd = Command::new(&command);
    cmd.args(&args);
    cmd.current_dir(&req.cwd);
    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    if let Some(env) = &req.env {
        cmd.envs(env);
    }

    match cmd.spawn() {
        Ok(mut child) => {
            let timeout_duration = std::time::Duration::from_millis(timeout_ms);
            let timed_out = std::time::Instant::now();

            loop {
                match child.try_wait() {
                    Ok(Some(status)) => {
                        let ended_at = Utc::now().to_rfc3339();
                        let duration_ms = start.elapsed().as_millis() as u64;

                        let stdout = if req.capture_stdout.unwrap_or(true) {
                            let mut out = String::new();
                            let _ = std::io::Read::read_to_string(
                                &mut child.stdout.take().unwrap(),
                                &mut out,
                            );
                            out
                        } else {
                            String::new()
                        };

                        let stderr = if req.capture_stderr.unwrap_or(true) {
                            let mut err = String::new();
                            let _ = std::io::Read::read_to_string(
                                &mut child.stderr.take().unwrap(),
                                &mut err,
                            );
                            err
                        } else {
                            String::new()
                        };

                        let (out, err) = if do_redact {
                            (redaction::redact_output(&stdout), redaction::redact_output(&stderr))
                        } else {
                            (stdout, stderr)
                        };

                        return RunnerResponse {
                            success: status.success(),
                            action: "run-command".to_string(),
                            exit_code: status.code(),
                            stdout: Some(out),
                            stderr: Some(err),
                            started_at,
                            ended_at,
                            duration_ms,
                            timed_out: None,
                            cancelled: None,
                            redacted: do_redact,
                            error: None,
                        };
                    }
                    Ok(None) => {
                        if timed_out.elapsed() > timeout_duration {
                            let _ = child.kill();
                            let ended_at = Utc::now().to_rfc3339();
                            let duration_ms = start.elapsed().as_millis() as u64;
                            return RunnerResponse {
                                success: false,
                                action: "run-command".to_string(),
                                exit_code: None,
                                stdout: None,
                                stderr: None,
                                started_at,
                                ended_at,
                                duration_ms,
                                timed_out: Some(true),
                                cancelled: None,
                                redacted: do_redact,
                                error: Some(RunnerError::new("TIMEOUT", &format!("Command timed out after {}ms", timeout_ms))),
                            };
                        }
                        std::thread::sleep(std::time::Duration::from_millis(10));
                    }
                    Err(e) => {
                        let ended_at = Utc::now().to_rfc3339();
                        let duration_ms = start.elapsed().as_millis() as u64;
                        return RunnerResponse {
                            success: false,
                            action: "run-command".to_string(),
                            exit_code: None,
                            stdout: None,
                            stderr: None,
                            started_at,
                            ended_at,
                            duration_ms,
                            timed_out: None,
                            cancelled: None,
                            redacted: do_redact,
                            error: Some(RunnerError::new("PROCESS_ERROR", &format!("Process error: {}", e))),
                        };
                    }
                }
            }
        }
        Err(e) => {
            let ended_at = Utc::now().to_rfc3339();
            let duration_ms = start.elapsed().as_millis() as u64;
            RunnerResponse {
                success: false,
                action: "run-command".to_string(),
                exit_code: None,
                stdout: None,
                stderr: None,
                started_at,
                ended_at,
                duration_ms,
                timed_out: None,
                cancelled: None,
                redacted: do_redact,
                error: Some(RunnerError::new("SPAWN_ERROR", &format!("Failed to spawn command '{}': {}", command, e))),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_empty_command_fails() {
        let req = RunCommandRequest {
            cwd: "/tmp".to_string(),
            command: None,
            args: None,
            timeout_ms: None,
            env: None,
            policy: None,
            capture_stdout: None,
            capture_stderr: None,
            redact_secrets: None,
        };
        let resp = run_command(&req);
        assert!(!resp.success);
        assert!(resp.error.is_some());
        assert_eq!(resp.error.as_ref().unwrap().code, "INVALID_REQUEST");
    }

    #[test]
    fn test_simple_command_succeeds() {
        let req = RunCommandRequest {
            cwd: "/tmp".to_string(),
            command: Some("echo".to_string()),
            args: Some(vec!["hello".to_string()]),
            timeout_ms: Some(5000),
            env: None,
            policy: None,
            capture_stdout: Some(true),
            capture_stderr: Some(true),
            redact_secrets: Some(false),
        };
        let resp = run_command(&req);
        assert!(resp.success);
        assert_eq!(resp.exit_code, Some(0));
        assert!(resp.stdout.unwrap_or_default().contains("hello"));
    }

    #[test]
    fn test_nonzero_exit_code() {
        let req = RunCommandRequest {
            cwd: "/tmp".to_string(),
            command: Some("sh".to_string()),
            args: Some(vec!["-c".to_string(), "exit 42".to_string()]),
            timeout_ms: Some(5000),
            env: None,
            policy: None,
            capture_stdout: Some(true),
            capture_stderr: Some(true),
            redact_secrets: Some(false),
        };
        let resp = run_command(&req);
        assert!(!resp.success);
        assert_eq!(resp.exit_code, Some(42));
    }

    #[test]
    fn test_denied_by_policy() {
        let req = RunCommandRequest {
            cwd: "/tmp".to_string(),
            command: Some("sudo".to_string()),
            args: Some(vec!["rm".to_string(), "-rf".to_string(), "/".to_string()]),
            timeout_ms: Some(5000),
            env: None,
            policy: None,
            capture_stdout: Some(true),
            capture_stderr: Some(true),
            redact_secrets: Some(false),
        };
        let resp = run_command(&req);
        assert!(!resp.success);
        assert!(resp.error.is_some());
        assert_eq!(resp.error.as_ref().unwrap().code, "POLICY_DENIED");
    }
}
