# Architecture Decision Records (ADRs)

This directory contains the Architecture Decision Records (ADRs) for **Domain Copilot**.

## Naming & Numbering Convention

All ADRs in this directory must be numbered sequentially with a 3-digit zero-padded prefix followed by a concise hyphenated title:

```text
docs/adr/
├── 001-clean-architecture-layer-boundaries.md
├── 002-composition-root-di-container.md
├── 003-postgres-pgvector-for-vector-store.md
└── ...
```

## Structure of an ADR

Each record should capture:
1. **Title**: Number and short descriptive decision title
2. **Status**: `PROPOSED`, `ACCEPTED`, `REJECTED`, or `DEPRECATED`
3. **Context**: The forces and technical problem driving the decision
4. **Decision**: What was decided and how it will be implemented
5. **Consequences**: Both positive and negative architectural trade-offs
