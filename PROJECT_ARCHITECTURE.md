# SuperDo AI - Current Architecture (Implementation Snapshot)

## 1) Current Goal (What We Are Building Right Now)
- Build a single personal productivity platform with secure auth and modular life-management tools.
- Keep all data user-isolated by default.
- Support both classic CRUD workflows and AI-assisted writing/productivity actions.
- Allow dynamic "custom sections" so users can create their own mini-modules without backend code changes.

## 2) High-Level System Architecture
```text
[Browser UI: HTML/CSS/JS + jQuery]
        |
        | HTTPS/HTTP JSON + Bearer Access Token
        | HttpOnly Refresh Cookie
        v
[Spring Boot API]
  -> Security Filter Chain (JWT, CORS, RBAC)
  -> Controllers (REST endpoints)
  -> Services (business logic)
  -> Repositories (Spring Data JPA)
  -> PostgreSQL (core app data)
        |
        | REST call (optional)
        v
[OpenAI Chat Completions API]
```

## 3) Repository Structure
| Path | Purpose |
|---|---|
| `superdo-ai-frontend/` | UI, user interactions, API calls |
| `superdo-ai-backend/` | REST API, auth, business logic, persistence |
| `superdo-ai-backend/src/main/resources/db/schema.sql` | Base schema for core tables |
| `start-frontend.js` | Local static server for frontend on port `5500` |
| `README.md` | Setup and feature summary |

## 4) Technology Stack
| Layer | Stack |
|---|---|
| Frontend | HTML, CSS, JavaScript, jQuery 3.7.1 |
| Backend Runtime | Java 17, Spring Boot 3.3.2 |
| Security | Spring Security, JWT (`jjwt`), refresh-token cookie flow |
| Data | Spring Data JPA + PostgreSQL |
| API Docs | springdoc OpenAPI + Swagger UI |
| AI | OpenAI Chat Completions via `RestTemplate` |

## 5) Backend Layered Architecture
| Layer | Responsibility | Main Packages |
|---|---|---|
| Controller | HTTP endpoint handling | `controller` |
| Service | Business logic, validation, orchestration | `service` |
| Repository | DB access abstraction | `repository` |
| Entity/DTO | Persistence models and API contracts | `entity`, `dto` |
| Security | JWT parsing, auth filter, principal | `security`, `config` |
| Error Handling | Consistent API errors | `exception` |

## 6) Auth and Session Workflow
| Step | Workflow |
|---|---|
| 1 | User logs in via email/password or Google ID token |
| 2 | Backend returns short-lived JWT access token |
| 3 | Backend sets refresh token in HttpOnly cookie (`superdo_refresh`) |
| 4 | Frontend stores access token in memory (`api._accessToken`) |
| 5 | Request uses `Authorization: Bearer <access-token>` |
| 6 | On `401`, frontend auto-calls `/api/auth/refresh` once |
| 7 | Backend rotates refresh token (old revoked, new issued) |
| 8 | Logout revokes current refresh token and clears cookie |

## 7) Authorization Model
| Area | Rule |
|---|---|
| Public routes | `/api/auth/register`, `/api/auth/login`, `/api/auth/google`, `/api/auth/refresh`, `/api/auth/config`, `/api/auth/logout`, Swagger docs |
| Protected routes | All other `/api/**` routes require JWT |
| Admin routes | `/api/admin/**` requires role `ADMIN` |
| Data isolation | Service/repository methods scoped by `userId` |

## 8) Functional Module Architecture
| Module | Purpose | Core Endpoints |
|---|---|---|
| Auth | Identity and session lifecycle | `/api/auth/*` |
| Notes | General note management | `/api/notes` |
| Rent Manager | Rent tracking and payment status | `/api/rent-records` |
| Marriage Planner | Event/vendor/checklist planning | `/api/marriage-planner` |
| Expense Tracker | Income/expense tracking and summary | `/api/expenses`, `/api/expenses/summary` |
| Custom Sections | Dynamic user-defined schemas and entries | `/api/custom-sections`, `/api/custom-sections/{id}/entries` |
| Dashboard | Aggregated overview metrics | `/api/dashboard/overview` |
| Global Search | Cross-module search | `/api/search/global` |
| AI Assistant | Note summarization and text assistance | `/api/ai/*` |
| Admin | Admin-only operational endpoint | `/api/admin/health` |

## 9) API Surface (Controller Map)
| Controller | Base Path | Methods |
|---|---|---|
| `AuthController` | `/api/auth` | `register`, `login`, `google`, `refresh`, `logout`, `me`, `config` |
| `NoteController` | `/api/notes` | list, create, update, delete |
| `RentRecordController` | `/api/rent-records` | list, create, update, delete |
| `MarriagePlannerController` | `/api/marriage-planner` | list, create, update, delete |
| `ExpenseController` | `/api/expenses` | list, summary, create, update, delete |
| `CustomSectionController` | `/api/custom-sections` | section CRUD + entry CRUD |
| `DashboardController` | `/api/dashboard` | `overview` |
| `GlobalSearchController` | `/api/search` | `global` |
| `AiController` | `/api/ai` | `summarize`, `grammar`, `action-items`, `suggest-title` |
| `AdminController` | `/api/admin` | `health` |

## 10) Data Architecture (PostgreSQL)
| Table | Role |
|---|---|
| `users` | User identity, role, provider linkage |
| `refresh_tokens` | Hashed refresh token store with revoke/expiry |
| `notes` | Notes with tags/reminder |
| `rent_records` | Monthly rent records and status |
| `marriage_planner` | Planner items and budgeting data |
| `expenses` | Income/expense entries |
| `custom_sections` | JSON schema definitions per user |
| `custom_section_entries` | JSON data rows for custom sections |

## 11) Frontend Architecture
| File | Responsibility |
|---|---|
| `superdo-ai-frontend/index.html` | Layout, sections, modals, controls |
| `superdo-ai-frontend/assets/js/api.js` | API client, token attach, 401 refresh retry |
| `superdo-ai-frontend/assets/js/app.js` | State, rendering, event handlers, CRUD actions, export flows |
| `superdo-ai-frontend/assets/css/styles.css` | Styling and theme behavior |

## 12) Frontend Runtime Workflow
| Step | Behavior |
|---|---|
| 1 | App loads auth config (`/api/auth/config`) |
| 2 | App tries refresh bootstrap (`/api/auth/refresh`) |
| 3 | On success, loads all modules (`notes`, `expenses`, `rent`, `marriage`, `custom sections`) |
| 4 | Dashboard widgets computed client-side from loaded data |
| 5 | Global search debounced, calls `/api/search/global?query=...` |
| 6 | CRUD actions trigger API + immediate re-render |
| 7 | Exports: expenses CSV, rent print/PDF flow, full JSON backup |

## 13) AI Feature Architecture
| Endpoint | Prompt Intent |
|---|---|
| `/api/ai/summarize` | Concise bullet summary |
| `/api/ai/grammar` | Improve grammar and clarity |
| `/api/ai/action-items` | Extract checklist actions |
| `/api/ai/suggest-title` | Generate short title |

## 14) Configuration Architecture
| Config Area | Key Values |
|---|---|
| Server | `server.port=8080` |
| DB | `app.database.*` (PostgreSQL + Hikari pool + SSL options) |
| JWT | `app.jwt.secret`, access token expiry |
| Auth | refresh cookie/token expiry, Google client ID, admin emails |
| CORS | `app.security.allowed-origins` |
| AI | `OPENAI_API_KEY`, model, API URL |

## 15) Current Project Workflow (Team/Development)
| Phase | Current Workflow |
|---|---|
| Local frontend run | `node start-frontend.js` (serves `http://localhost:5500`) |
| Local backend run | `cd superdo-ai-backend && mvn spring-boot:run` |
| API verification | Swagger at `http://localhost:8080/swagger-ui/index.html` |
| Feature delivery style | Add/update entity -> repository -> service -> controller -> frontend API call -> UI render |
| Security-first rule | Any new endpoint should be protected by default unless explicitly public |

## 16) Current Feature Inventory (Implemented Now)
- User registration/login with JWT + refresh-cookie session model.
- Google Sign-In path via token verification endpoint.
- Role model (`USER`, `ADMIN`) with admin route guard.
- Full CRUD: Notes, Rent, Marriage Planner, Expenses.
- Dynamic Custom Sections with schema + entries.
- Dashboard overview aggregation endpoint.
- Cross-module global search endpoint.
- AI utilities for note productivity.
- Client exports (CSV, print/PDF, JSON backup).
- Theme toggle, profile preferences in local storage, reminder toasts.
