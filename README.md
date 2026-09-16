# Domain Copilot

**Domain Copilot** is an agentic RAG platform engineered for **Industrial Field Maintenance**, featuring an automated diagnostic workflow, telemetry anomaly triage, and an integrated **Human Review Queue** for safety-critical and low-confidence operations.

---

## Variant

> **Domain = D5 (Industrial Field Maintenance), Twist = T5 (Human Review Queue), derived via (last two digits of National ID) mod 7 = 5, (sum of all digits) mod 8 = 5**

- **Domain (D5) - Industrial Field Maintenance**: Focused on industrial plant equipment (turbines, pumps, compressors, motors), sensor telemetry analysis, maintenance ticketing, repair manual semantic search, and diagnostic recommendations.
- **Twist (T5) - Human Review Queue**: Critical, low-confidence (< threshold), or high-impact actions trigger an asynchronous human-in-the-loop review queue. Unapproved actions are held in a pending state until a human specialist reviews and signs off.

---

## Architecture Layout

The codebase strictly implements **Clean Architecture** organized into 4 decoupled layers under `src/`:

```
src/
├── domain/         # Pure business entities, value objects, domain errors (ZERO external dependencies)
├── application/    # Use cases, DTOs, outbound port interfaces (depends ONLY on domain)
├── infrastructure/ # Concrete adapters (Postgres/pgvector, LLM, review queue) & Composition Root (container)
└── api/            # HTTP delivery layer (Fastify router, controllers, middlewares)
```

### Why `domain/` and `application/` Have Zero Framework Dependencies
- **Independence of Frameworks**: `src/domain/` encapsulates pure business logic, entities, and validation rules. It does not import database drivers, web frameworks, or AI provider SDKs. This ensures domain rules survive changes to tech stacks or infrastructure vendors.
- **Testability**: Pure domain and application layers can be thoroughly unit tested in isolation without spinning up databases, mocking HTTP servers, or requiring network access.
- **Port & Adapter Inversion**: `src/application/` defines contracts (outbound ports such as `IEquipmentRepository`, `ILLMProvider`, `IReviewQueueGateway`). `src/infrastructure/` implements these ports, allowing concrete tools (Fastify, PostgreSQL, pgvector, OpenAI, Ollama) to be swapped or upgraded without touching domain logic.

---

## Getting Started

### Prerequisites
- **Node.js**: >= 20.x (v24.x recommended)
- **Docker & Docker Compose**: for local PostgreSQL + pgvector

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd iti_ai_task
npm install
```

### 2. Environment Configuration
Copy the example environment file:
```bash
cp .env.example .env
```

### 3. Start Database Infrastructure (PostgreSQL + pgvector)
```bash
docker compose up -d
```
This launches a PostgreSQL 16 instance pre-configured with the `pgvector` extension on port `5432`.

### 4. Development & Verification
```bash
# Typecheck TypeScript files
npm run typecheck

# Lint with ESLint
npm run lint

# Run unit and architectural tests
npm test

# Start in development mode
npm run dev
```

---

## License

This project is licensed under the [MIT License](LICENSE).
