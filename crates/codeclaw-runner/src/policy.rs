use crate::types::CommandPolicy;

const DEFAULT_DENY_PATTERNS: &[&str] = &[
    "rm -rf /",
    "rm -rf /*",
    "sudo ",
    "chmod 777 ",
    "chmod 7777 ",
    "curl | sh",
    "curl | bash",
    "wget | sh",
    "wget | bash",
    "eval ",
    "dd if=",
    "mkfs.",
    ":(){ :|:& };:",
    "> /dev/sda",
    "| sh",
    "| bash",
];

pub fn check_command_policy(
    command: &str,
    args: &[String],
    policy: &Option<CommandPolicy>,
) -> Result<(), String> {
    let full_command = if args.is_empty() {
        command.to_string()
    } else {
        format!("{} {}", command, args.join(" "))
    };

    if let Some(p) = policy {
        if let Some(allow) = &p.allow_commands {
            if !allow.iter().any(|a| command == a || command.starts_with(&format!("{}/", a))) {
                return Err(format!(
                    "Command '{}' is not in the allowed commands list: {:?}",
                    command, allow
                ));
            }
        }

        if let Some(deny) = &p.deny_patterns {
            for pattern in deny {
                if full_command.contains(pattern.as_str()) {
                    return Err(format!(
                        "Command denied by policy: pattern '{}' matched in '{}'",
                        pattern, full_command
                    ));
                }
            }
        }
    }

    for pattern in DEFAULT_DENY_PATTERNS {
        if full_command.contains(pattern) {
            return Err(format!(
                "Command denied by security policy: pattern '{}' matched",
                pattern
            ));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allows_safe_commands() {
        let result = check_command_policy("pnpm", &["test".to_string()], &None);
        assert!(result.is_ok());
    }

    #[test]
    fn test_denies_rm_rf() {
        let result = check_command_policy("rm", &["-rf".to_string(), "/".to_string()], &None);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("rm -rf /"));
    }

    #[test]
    fn test_denies_sudo() {
        let result = check_command_policy("sudo", &["rm".to_string()], &None);
        assert!(result.is_err());
    }

    #[test]
    fn test_allow_list() {
        let policy = CommandPolicy {
            allow_commands: Some(vec!["pnpm".to_string()]),
            deny_patterns: None,
        };
        let result = check_command_policy("pnpm", &["test".to_string()], &Some(policy));
        assert!(result.is_ok());
    }

    #[test]
    fn test_deny_not_in_allow_list() {
        let policy = CommandPolicy {
            allow_commands: Some(vec!["pnpm".to_string()]),
            deny_patterns: None,
        };
        let result = check_command_policy("npm", &["install".to_string()], &Some(policy));
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not in the allowed commands list"));
    }

    #[test]
    fn test_deny_custom_pattern() {
        let policy = CommandPolicy {
            allow_commands: None,
            deny_patterns: Some(vec!["dangerous".to_string()]),
        };
        let result = check_command_policy("echo", &["dangerous".to_string()], &Some(policy));
        assert!(result.is_err());
    }
}
