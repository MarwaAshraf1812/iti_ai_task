# Contributing to Domain Copilot

Thank you for contributing to **Domain Copilot**! To maintain architectural purity, code quality, and auditability, all development must adhere to these guidelines.

---

## 1. Branching & PR Workflow

- **No Direct Pushes to `main`**:
  Direct pushes to `main` are strictly forbidden. All modifications must be submitted via Pull Requests.
  
  > **Explicit Exception**: The very first bootstrap commit (repository skeleton and initial tooling setup) is pushed directly to `main` to establish the root branch. Branch protection rules are enabled immediately afterward, and every commit from that point forward must be introduced via a Pull Request.

- **Pull Request Lifecycle**:
  1. Create a feature or bugfix branch off `main`:
     - `feat/<issue-or-scope>-<description>`
     - `fix/<issue-or-scope>-<description>`
     - `chore/<description>`
     - `docs/<description>`
  2. Implement changes respecting Clean Architecture layer boundaries.
  3. Ensure all local validations pass:
     ```bash
     npm run typecheck
     npm run lint
     npm test
     ```
  4. Submit a Pull Request using the repository's PR template (`.github/PULL_REQUEST_TEMPLATE.md`).

- **Review Requirement**:
  - Because this is an individual assessment project with a single contributor, each PR requires a **self-review with inline review comments** walking through key architectural choices before merging.
  - All automated CI pipeline checks (`validate` job: npm ci, lint, typecheck, test) must be **green** before merging.

---

## 2. Conventional Commits

We enforce the [Conventional Commits](https://www.conventionalcommits.org/) standard on all commit messages.

### Format
```text
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Allowed Types
- **`feat:`** Introduces a new feature or domain capability
- **`fix:`** Patches a bug or addresses an issue
- **`chore:`** Maintenance, dependency updates, or configuration changes
- **`docs:`** Documentation-only updates
- **`refactor:`** Code restructuring without functional behavior changes
- **`test:`** Adding or updating automated test suites

---

## 3. Clean Architecture Layer Discipline

Keep the 4 layers strictly decoupled:
- **`src/domain/`**: Pure entities & domain exceptions only. **ZERO external dependencies** (no fastify, no postgres, no langchain/openai/ollama).
- **`src/application/`**: Use cases, DTOs, outbound port interfaces. Depends **ONLY** on domain.
- **`src/infrastructure/`**: Concrete adapters implementing ports, plus the Composition Root (`container.ts`).
- **`src/api/`**: HTTP delivery layer (Fastify router, controllers, middlewares), depends on application.
