# Rock-Solid Web App Security Manifest

Transitioning from "vibe coding" to a production-ready application requires a systematic approach to lock down every layer of your stack. This guide provides concrete, actionable instructions to secure your frontend, backend, database, and repository.

## 1. Repository & Secret Management
**Goal:** Ensure no API keys, database credentials, or private tokens ever leak into version control.

*   **Eradicate Hardcoded Secrets:** Never store sensitive strings in your source code. 
*   **Environment Variables:** Use a `.env` file for local development and a robust secrets manager (like AWS Secrets Manager, Google Secret Manager, or HashiCorp Vault) for production.
*   **Clean Up GitHub History:** If you have already committed secrets during the vibe coding phase, simply deleting the file and making a new commit is not enough; the secret remains in the Git history.
    *   Use **BFG Repo-Cleaner** or **git-filter-repo** to completely scrub the secrets from your repository's history.
    *   Invalidate and rotate *any* keys that were ever pushed, even for a second.
*   **Pre-commit Hooks:** Set up tools like **TruffleHog** or **GitGuardian** to scan for secrets before a commit is even allowed to execute.

## 2. Backend API & Access Control
**Goal:** Prevent unauthorized access, broken access control, and API abuse.

*   **Strict Input Validation:** Never trust client data. Validate all incoming payloads strictly against defined schemas. In modern Python frameworks like FastAPI, leverage Pydantic models to ensure that payloads strictly conform to expected types and ranges before they even hit your business logic.
    ```python
    from pydantic import BaseModel, Field

    class UserInput(BaseModel):
        username: str = Field(..., min_length=3, max_length=50)
        age: int = Field(..., gt=0, lt=120)
    ```
*   **Fix Broken Access Control (IDOR):** Verify that the authenticated user actually has permission to access or modify the specific resource they are requesting. Never rely on the client passing a `user_id` in a payload; extract it securely from their session or JWT token.
*   **Rate Limiting:** Protect your endpoints against brute-force and Denial-of-Service (DoS) attacks.
    *   Implement token-bucket or sliding-window rate limiting. If using Python/FastAPI, libraries like `slowapi` can easily apply limits (e.g., `5/minute` for login routes).
*   **Security Headers:** Enforce headers like `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY`.

## 3. Database Security & Injection Prevention
**Goal:** Ensure zero unauthorized data execution and structural integrity of your database.

*   **Eradicate SQL Injection:** Absolutely zero string concatenation for database queries. Always use Parameterized Queries or a reputable Object-Relational Mapper (ORM) like SQLAlchemy or Prisma.
    ```python
    # VULNERABLE (Never do this)
    # cursor.execute(f"SELECT * FROM users WHERE username = '{user_input}'")
    
    # ROCK SOLID (Parameterized)
    # cursor.execute("SELECT * FROM users WHERE username = %s", (user_input,))
    ```
*   **Principle of Least Privilege:** Your application's database user should only have the permissions it strictly needs (e.g., `SELECT`, `INSERT`, `UPDATE`, `DELETE`). It should *never* have permission to `DROP` tables or alter the database schema.
*   **Data Sanitization:** While parameterized queries protect the database engine, ensure you sanitize inputs to prevent storing malicious payloads that might be rendered later by the frontend.

## 4. Frontend Security
**Goal:** Protect the user's browser environment from executing malicious scripts and cross-site attacks.

*   **Cross-Site Scripting (XSS) Prevention:**
    *   Never use dangerous inner-HTML injections without strict sanitization (e.g., using DOMPurify).
    *   Implement a strict **Content Security Policy (CSP)** header to restrict where scripts, styles, and images can be loaded from.
*   **Cross-Site Request Forgery (CSRF):** Use Anti-CSRF tokens for state-changing requests, especially if you rely on cookie-based session authentication. Ensure cookies have `HttpOnly`, `Secure`, and `SameSite=Strict` attributes.
*   **CORS (Cross-Origin Resource Sharing):** Do not use `Access-Control-Allow-Origin: *`. Explicitly whitelist the exact domains of your frontend applications.

## 5. Performance & Reliability
**Goal:** Ensure the app does not choke under load or expose vulnerabilities through performance bottlenecks.

*   **Pagination:** Never return entire database tables in a single API call. Enforce `limit` and `offset` (or cursor-based pagination) to prevent memory exhaustion.
*   **Timeouts:** Configure strict timeouts for external API calls, database connections, and incoming requests to prevent slow-loris attacks or hanging resources.
*   **Dependency Auditing:** Run automated dependency vulnerability scanners (like `pip-audit` or GitHub Dependabot) to ensure your third-party libraries aren't introducing known CVEs.

---
**Next Steps:** Review your current codebase layer by layer using this document as a checklist. Start with your GitHub repository and environment variables, then move into your database querying logic, and finish with API access controls.