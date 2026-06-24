const SECRET_PATTERNS: &[&str] = &[
    "sk-",
    "xoxb-",
    "xoxp-",
    "xoxa-",
    "xoxr-",
    "ghp_",
    "gho_",
    "ghu_",
    "ghs_",
    "ghr_",
    "CODECLAW_",
    "AITEAM_",
    "SLACK_BOT_TOKEN",
    "SLACK_SIGNING_SECRET",
];

const SECRET_REGEX_PATTERNS: &[&str] = &[
    r#"(["'])?(api[_-]?key|apikey|token|secret|password)\1?\s*[=:]\s*["']?\w+["']?"#,
    r#"(bearer|Bearer)\s+[A-Za-z0-9\-._~+/]+=*"#,
    r#"postgres://\w+:\w+@"#,
    r#"mysql://\w+:\w+@"#,
    r#"redis://:\w+@"#,
];

pub fn redact_line(line: &str) -> String {
    let mut result = line.to_string();

    for pattern in SECRET_PATTERNS {
        if result.contains(pattern) {
            result = result.replace(pattern, "[REDACTED]");
        }
    }

    for regex_str in SECRET_REGEX_PATTERNS {
        if let Ok(re) = regex_lite::Regex::new(regex_str) {
            result = re.replace_all(&result, "$1[REDACTED]$1").to_string();
        }
    }

    result
}

pub fn redact_output(output: &str) -> String {
    output.lines().map(|line| redact_line(line)).collect::<Vec<_>>().join("\n")
}

pub fn should_redact(config: Option<bool>) -> bool {
    config.unwrap_or(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redacts_api_key() {
        let result = redact_line("api_key=sk-1234567890abcdef");
        assert!(!result.contains("sk-1234567890abcdef"));
    }

    #[test]
    fn test_redacts_slack_token() {
        let result = redact_line("token=xoxb-1234567890-abcdef");
        assert!(!result.contains("xoxb-1234567890"));
    }

    #[test]
    fn test_leaves_safe_text() {
        let result = redact_line("hello world");
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_redacts_bearer_token() {
        let result = redact_line("Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.token");
        assert!(result.contains("[REDACTED]"));
    }

    #[test]
    fn test_redacts_database_url() {
        let result = redact_line("postgres://user:secretpassword@localhost:5432/db");
        assert!(!result.contains("secretpassword"));
    }
}
