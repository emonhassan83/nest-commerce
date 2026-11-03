# ADR 0001: Adoption of Modular Monolith with Clean Architecture and DDD

- **Status**: Accepted
- **Date**: 2026-11-03
- **Deciders**: Senior Engineering Team

## Context & Problem Statement
We are building **Nest Commerce**, a high-performance, enterprise-grade e-commerce engine designed to support multi-vendor catalogs, shopping carts, orders, payment gateways, shipping, inventory reservations, and promotions.

Building a distributed microservices architecture from day one introduces high operational overhead (network latency, distributed transactions/Saga complexities, multi-repo CI/CD overhead, and cluster orchestration). Conversely, an unconstrained monolith quickly degenerates into an unmaintainable "Big Ball of Mud" with tightly tangled database queries and high coupling.

## Decision
We decided to adopt a **Modular Monolith** architecture governed by **Clean Architecture** and **Domain-Driven Design (DDD)** bounded contexts.

Key elements:
1. **Single Deployable Unit**: The application runs and deploys as a cohesive NestJS application, simplifying deployment, testing, and debugging.
2. **Explicit Bounded Contexts**: Modules inside `src/modules/` (e.g. `catalog`, `orders`, `payments`, `inventory`) operate with strict boundaries.
3. **Layered Decoupling**: Each module enforces Domain, Application, Presentation, and Infrastructure separation.
4. **Event-Driven Side Effects**: Cross-module asynchronous communication occurs via domain events, eliminating circular dependencies and unnecessary coupling.
5. **Database Ownership**: In the shared database schema, tables are logically partitioned by bounded context.

## Consequences
### Positive
- Rapid local development experience with single command startup.
- Full type safety across modules using TypeScript interfaces.
- Seamless transactional integrity where required, avoiding distributed transaction complexity.
- Easy migration path: any bounded context can be extracted into an independent microservice later without architectural rewrites.

### Negative / Trade-offs
- Requires discipline to prevent developers from bypassing module boundaries or deep-importing internal module files.
- Code reviews must enforce strict adherence to layer separation and barrel export restrictions.

