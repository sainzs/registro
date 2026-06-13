# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Registro, please report it responsibly.

### How to Report

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please email: **sainzs@users.noreply.github.com**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to Expect

- **Acknowledgment**: We will acknowledge receipt within 48 hours
- **Assessment**: We will assess the vulnerability within 7 days
- **Resolution**: We will work to resolve critical vulnerabilities within 30 days
- **Disclosure**: We will coordinate disclosure with you after a fix is available

### Security Considerations

Registro is a **CLI and web dashboard** for agent work reports. Security considerations include:

1. **File System Access**: The CLI reads git status, package.json, and other project files. It does not modify files or execute arbitrary commands.

2. **Web Dashboard**: The web app runs locally on `http://localhost:3000` by default. It does not make external network requests unless explicitly configured.

3. **Data Handling**: Reports contain project metadata (file counts, git status, etc.). This data is not sent to external services.

4. **Dependencies**: Registro uses standard npm packages. Security updates should be applied promptly via `npm audit` and `npm update`.

### Security Best Practices

When using Registro:

- Run the CLI in trusted repositories only
- Do not expose the web dashboard to the public internet
- Keep dependencies updated via `npm audit fix`
- Review report output before sharing it

## Security Updates

Security updates will be released as patch versions (e.g., 0.4.0 → 0.4.1) and announced via GitHub Security Advisories.

## Responsible Disclosure

We appreciate responsible disclosure. If you report a valid security vulnerability, we will:

- Credit you in the security advisory (unless you prefer to remain anonymous)
- Mention your contribution in the CHANGELOG
- Work with you to understand and resolve the issue

Thank you for helping keep this project secure.
