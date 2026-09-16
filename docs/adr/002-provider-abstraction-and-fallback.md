# ADR 002: LLM Provider Abstraction and Resilient Fallback Chain

## Status
ACCEPTED

## Context
**Domain Copilot** operates in the context of **Industrial Field Maintenance (D5)**, where plant equipment downtime carries severe financial and safety consequences. Diagnostic workflows, manual lookups, and human review triage cannot tolerate service interruptions caused by cloud API outages, rate limits, or network connectivity loss.

Simultaneously, Clean Architecture requires that application use cases remain strictly decoupled from specific LLM vendor SDKs and network protocols.

## Decision

### 1. Single Unified Interface (`ILLMProvider`)
We established a single outbound port in `src/application/ports/llm-provider.port.ts` encapsulating all core LLM operations:
- `complete(prompt, systemPrompt)`
- `streamComplete(prompt, systemPrompt)` (AsyncGenerator)
- `callWithTools(prompt, tools, systemPrompt)`
- `embed(texts)`

All domain orchestration and use cases interact exclusively with `ILLMProvider`, without knowledge of whether execution occurs in Google Cloud or on a local machine.

### 2. Dual Provider Strategy: Gemini (Cloud) + Ollama (Local)
We selected **Gemini** and **Ollama** as complementary provider adapters:
- **Google Gemini (Cloud Primary)**:
  - High-precision reasoning over dense industrial manuals and sensor telemetry.
  - Large context window and robust function calling.
  - Cost-efficient embeddings via `text-embedding-004`.
- **Ollama (Local / Edge Fallback)**:
  - Local, air-gapped inference on industrial workstation hardware (`qwen2.5:3b` / `nomic-embed-text`).
  - Ensures continuous operational availability when field technicians lose cloud internet access.
  - Zero external data egress for sensitive site configurations.

### 3. Resilient Fallback Execution (`ResilientLLMProvider`)
The DI container wires `ResilientLLMProvider`, which manages a primary and fallback provider chain:
- **Fallback Trigger Conditions**:
  - **Timeout**: The primary provider call exceeds the configured threshold (`timeoutMs`, default 10,000ms).
  - **Rate Limiting & Quota**: HTTP 429 Too Many Requests or quota exhaustion.
  - **Authentication / Authorization Errors**: Invalid or expired API keys.
  - **Connectivity & Upstream Errors**: DNS resolution failure, socket hang-up, or HTTP 5xx responses.
- **Logging & Observability**:
  - Every fallback event emits a structured warning containing the primary provider name, fallback provider name, target method name, and error classification.

### 4. Known Limitation: Tool-Calling Reliability on Small Local Models
Frontier cloud models (such as Gemini 2.5 Flash / 3.8 Flash) reliably output conformant function calls. Conversely, small local models (such as `qwen2.5:3b`) exhibit varying adherence to tool-calling schemas.

**Mitigation & Fallback**:
`OllamaLLMProvider` first attempts native Ollama `/api/chat` function calling. If native tool calling fails or returns no function calls, it executes a prompt-based fallback that instructs the model to produce structured JSON matching the target schema, and parses the resulting payload.

## Consequences

### Positive
- **High Fault Tolerance**: Automatic failover ensures uninterrupted field diagnostics.
- **Vendor Agnostic**: Providers can be swapped or added (e.g. Anthropic, vLLM) without impacting application use cases.
- **Observability**: Structured logs provide immediate visibility into provider degradation.

### Negative
- **Latency on Failover**: When failover triggers on a timeout, the total response time includes the timeout duration plus fallback execution time.
- **Response Quality Variance**: A 3B local fallback model will produce less sophisticated reasoning than a frontier cloud model.
