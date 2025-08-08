# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please responsibly disclose it by emailing security@sql-analyzer.dev or opening a private security advisory on GitHub.

We will acknowledge receipt within 48 hours and provide a timeline for the fix.

## Supported Versions

We support the latest minor for the current major release. Older majors receive security fixes on a best-effort basis.

## Security Best Practices (Project)

- 2FA required for maintainers and npm publishers
- Protected `main` branch with required PR reviews and CI checks
- Least-privilege GitHub tokens; restrict GitHub Actions permissions
- Store secrets in GitHub Secrets; rotate npm tokens regularly
- Dependabot alerts and security updates enabled
- Code scanning (CodeQL) enabled

## Data Handling

- Analysis runs locally; no customer data is sent off-host
- Optional AI uses metadata only if enabled via `OPENAI_API_KEY`
- Users are responsible for database credentials security

