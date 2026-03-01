# SuperDo AI

Smart AI-powered Notes and Life Management App.

## Folder Structure

```text
SuperDo/
  superdo-ai-backend/
    pom.xml
    src/main/java/com/superdo/ai/
      config/
      controller/
      dto/
      entity/
      exception/
      repository/
      security/
      service/
      SuperDoAiApplication.java
    src/main/resources/
      application.yml
      db/schema.sql
  superdo-ai-frontend/
    index.html
    assets/css/styles.css
    assets/js/api.js
    assets/js/app.js
```

## Backend Features

- Secure auth/session flow:
  - Email register/login: `/api/auth/register`, `/api/auth/login`
  - Google OAuth login (ID token): `/api/auth/google`
  - Session refresh rotation: `/api/auth/refresh`
  - Logout + session revoke: `/api/auth/logout`
  - Current user info: `/api/auth/me`
- BCrypt password hashing
- Refresh token hashing + server-side persistence
- HttpOnly refresh cookie management
- Short-lived JWT access tokens with role claims
- Role-based authorization (`USER`, `ADMIN`)
- User-based data isolation across all modules
- Layered architecture: controller, service, repository, DTO
- Global exception handling
- OpenAI integration service + endpoints:
  - `POST /api/ai/summarize`
  - `POST /api/ai/grammar`
  - `POST /api/ai/action-items`
  - `POST /api/ai/suggest-title`

## Section Endpoints (Sample CRUD)

- Notes: `/api/notes`
- Rent Manager: `/api/rent-records`
- Marriage Planner: `/api/marriage-planner`
- Expense Tracker: `/api/expenses`, `/api/expenses/summary`
- Custom Sections: `/api/custom-sections`, `/api/custom-sections/{id}/entries`
- Dashboard Overview: `/api/dashboard/overview`

## Run Backend

1. Configure MySQL credentials in `superdo-ai-backend/src/main/resources/application.yml`.
2. Set environment variables:
   - `JWT_SECRET` (minimum 32+ bytes, production secret)
   - `GOOGLE_CLIENT_ID` (for Google OAuth)
   - `ALLOWED_ORIGINS` (comma-separated frontend origins)
   - `ADMIN_EMAILS` (comma-separated admin emails, optional)
   - `OPENAI_API_KEY` (optional, for AI endpoints)
3. Run:

```bash
cd superdo-ai-backend
mvn spring-boot:run
```

Swagger UI:
- `http://localhost:8081/swagger-ui/index.html`

## Frontend

Serve `superdo-ai-frontend/` with any static server (or open `index.html` directly for basic use).

For local static server examples:

```bash
# Python
python -m http.server 5500

# Node (if installed)
npx serve superdo-ai-frontend
```

Then open the frontend URL and use login/register modal.

## Scalability Hooks Included

- Stateless JWT security for future mobile/web clients
- Clean service boundaries for notifications/email integrations
- JSON-based custom section schema for dynamic modules
- Dashboard aggregation service for analytics extension
