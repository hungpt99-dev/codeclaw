# Security

## Local-First Architecture

This product runs entirely on the user's machine. There is no cloud backend, no remote API, and no data exfiltration.

## Secrets Management

- Never commit real tokens, API keys, or credentials.
- Never store Jira, Slack, or GitHub tokens in config files.
- Secrets must go to OS keychain or environment variables.
- Use `.env.example` as a template; actual `.env` is gitignored.

## Protected Files

The following files are protected and should not be modified without careful review:

- `.dependency-cruiser.cjs` - architecture boundary rules
- `eslint.config.js` - lint rules
- `tsconfig.base.json` - type safety rules
- `.husky/*` - git hooks

## Blocked Commands

The system should never execute destructive commands without explicit user confirmation.

## No Cloud Backend

There is no server-side component. All data processing happens locally. No user data leaves the machine.

## Future Considerations

- Secret masking in logs and UI
- Encrypted local storage
- Command allowlisting
