# Security

This is unsupported commercetools-labs reference code ([SUPPORT.md](SUPPORT.md)); there is no
service-level agreement and no guaranteed fix. We would still like to hear about vulnerabilities.

**Please do not open a public issue.** Use GitHub's private reporting: on the repository page choose
**Security -> Report a vulnerability**. Include the affected path, what an attacker can do and a
minimal reproduction.

Areas of most interest: token verification and the `SERVICE_API_TOKEN` comparison in `service/`, CORS
handling, file upload and media listing, the MCP application's bearer check, and the Merchant Center
proxy request path.

If you run this code, you are responsible for reviewing it, rotating `SERVICE_API_TOKEN` and
`MCP_ACCESS_TOKEN` (see [docs/runbook.md](docs/runbook.md)), and keeping your commercetools API client
scopes minimal.
