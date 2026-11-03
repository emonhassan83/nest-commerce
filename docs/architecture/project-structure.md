# Nest Commerce - Architecture & Project Structure

## 1. Architectural Philosophy

Nest Commerce is engineered as an **Enterprise Modular Monolith** that blends **Domain-Driven Design (DDD)** and **Clean Architecture (Hexagonal / Ports & Adapters)** principles.

### Key Goals
- **High Cohesion, Loose Coupling**: Each domain module is autonomous with clear boundaries. Modules communicate either via explicit exported interfaces/services or asynchronous domain events.
- **Maintainability & Scalability**: Avoid the spaghetti architecture typical in large monorepos or unorganized codebases while avoiding the premature operational complexity of microservices.
- **Microservices-Ready**: Should the business need to extract a domain (e.g., `orders`, `payments`, or `search`) into an independent microservice in the future, the boundary is already clean and separated.

---

## 2. Global Directory Structure

```text
nest-commerce/
│
├── src/
│   │
│   ├── main.ts                       # Application entry point & bootstrap (Pipes, Interceptors, Filters, Swagger)
│   ├── app.module.ts                 # Root module orchestrating infrastructure, config, and domain modules
│   │
│   ├── config/                       # Type-safe configuration management (@nestjs/config)
│   │   ├── app.config.ts             # App port, env, prefix, cors
│   │   ├── database.config.ts        # Database connection pool and URLs
│   │   ├── redis.config.ts           # Redis caching & queue connection
│   │   ├── jwt.config.ts             # Authentication secrets & expiry
│   │   └── payment.config.ts         # Stripe/SSLCommerz/Bkash gateway credentials
│   │
│   ├── common/                       # Shared cross-cutting concerns (framework level, non-business logic)
│   │   ├── decorators/               # Custom param/method decorators (@CurrentUser, @Public, @Permissions)
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── permissions.decorator.ts
│   │   │
│   │   ├── guards/                   # Authentication & Authorization guards
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── permissions.guard.ts
│   │   │
│   │   ├── filters/                  # Global exception filters
│   │   │   └── http-exception.filter.ts
│   │   │
│   │   ├── interceptors/             # Response wrapping & logging interceptors
│   │   │   ├── response.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   │
│   │   ├── pipes/                    # Validation and transformation pipes
│   │   ├── exceptions/               # Custom business domain exceptions
│   │   ├── constants/                # Global string tokens, metadata keys
│   │   ├── enums/                    # System-wide enums (Roles, Environment)
│   │   └── utils/                    # Helper functions, crypto utils, string manipulators
│   │
│   ├── infrastructure/               # Low-level external technical implementations
│   │   ├── database/                 # Prisma ORM connection lifecycle & Unit of Work / Transactions
│   │   │   ├── database.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── transaction.service.ts
│   │   │
│   │   ├── cache/                    # Redis caching adapter
│   │   │   ├── cache.module.ts
│   │   │   └── redis.service.ts
│   │   │
│   │   ├── queue/                    # BullMQ / Redis-based background job processing
│   │   │   ├── queue.module.ts
│   │   │   └── processors/
│   │   │
│   │   ├── storage/                  # Object storage (AWS S3 / Cloudflare R2 / MinIO)
│   │   │   ├── storage.module.ts
│   │   │   └── s3-storage.service.ts
│   │   │
│   │   ├── email/                    # SMTP / Sendgrid / Resend mail delivery adapters
│   │   ├── sms/                      # SMS gateway integration (Twilio / Local SMS providers)
│   │   ├── payments/                 # External payment gateway SDK integrations
│   │   └── messaging/                # Event bus, RabbitMQ / Kafka / Redis PubSub adapters
│   │
│   ├── modules/                      # Business Bounded Contexts (Core Domain Modules)
│   │   ├── identity/                 # Auth, JWT, refresh tokens, MFA, password reset
│   │   ├── users/                    # Customer profiles, addresses, user preferences
│   │   ├── sellers/                  # Multi-vendor onboarding, seller verification, store settings
│   │   ├── catalog/                  # Products, variants, SKUs, attributes, brands
│   │   ├── categories/               # Nested tree taxonomy, category hierarchies
│   │   ├── inventory/                # Stock level tracking, warehouse allocations, locks
│   │   ├── pricing/                  # Price lists, tier pricing, currency management
│   │   ├── cart/                     # Shopping cart operations, guest cart sync
│   │   ├── orders/                   # Order placement, status state machine, cancellation
│   │   ├── payments/                 # Payment intent, transactions, webhook processing, refunds
│   │   ├── shipping/                 # Shipping carriers, rates, tracking numbers, fulfillment
│   │   ├── reviews/                  # Product reviews, ratings, moderation
│   │   ├── promotions/               # Discount vouchers, coupon codes, campaign engines
│   │   ├── search/                   # Full-text search (Elasticsearch / Meilisearch / Algolia)
│   │   ├── notifications/            # Push notifications, in-app alerts, activity feeds
│   │   ├── admin/                    # Platform administration, audit logs, backoffice endpoints
│   │   └── analytics/                # Sales metrics, performance counters, revenue reports
│   │
│   ├── events/                       # Application & Integration Events
│   │   ├── domain/                   # In-process domain events (e.g. OrderCreatedEvent)
│   │   └── integration/              # Outbox / Distributed cross-service event contracts
│   │
│   ├── health/                       # Liveness, readiness, and Terminus health checks
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   │
│   └── app.module.ts
│
├── prisma/                           # Database Schema & Migrations
│   ├── schema.prisma                 # Primary data model definition
│   ├── migrations/                   # Migration history
│   └── seed.ts                       # Database seeding script for development
│
├── test/                             # Automated testing suites
│   ├── integration/                  # Module integration tests
│   ├── e2e/                          # End-to-end API scenario tests
│   └── fixtures/                     # Test data factories and mocks
│
├── scripts/                          # DevOps, migration, and automation shell scripts
├── docs/                             # Engineering Architecture & Specifications
│   ├── architecture/                 # System architecture diagrams, patterns, DDD docs
│   ├── api/                          # OpenAPI / Swagger specs, payload contracts
│   └── decisions/                    # Architecture Decision Records (ADRs)
│
├── .env.example                      # Documented environment variable template
├── .gitignore                        # Git exclusion rules
├── Dockerfile                        # Multi-stage optimized production container build
├── docker-compose.yml                # Local services (PostgreSQL, Redis, MinIO, MailHog)
├── nest-cli.json                     # NestJS CLI configuration
├── package.json                      # Dependency manifests and scripts
├── tsconfig.json                     # TypeScript compiler configuration
└── README.md                         # Main repository entry point
```

---

## 3. Module Internal Architecture (Clean Architecture / DDD)

Each module in `src/modules/<module-name>` adheres to layered Clean Architecture:

```text
src/modules/orders/
├── controllers/              # [Presentation Layer] HTTP / GraphQL / Webhook controllers
│   ├── order.controller.ts
│   └── admin-order.controller.ts
│
├── dtos/                     # [Presentation Layer] Request validation DTOs and Response serializers
│   ├── create-order.dto.ts
│   ├── order-response.dto.ts
│   └── update-order-status.dto.ts
│
├── services/                 # [Application Layer] Use case orchestrators, application services
│   └── order.service.ts
│
├── interfaces/               # [Domain/Application Layer] Repository contracts, service ports
│   └── order-repository.interface.ts
│
├── repositories/             # [Infrastructure Layer] Prisma/database persistence adapters
│   └── order.prisma-repository.ts
│
├── domain/                   # [Domain Layer] Business entities, Value Objects, Domain Exceptions
│   ├── order.entity.ts
│   ├── order-item.entity.ts
│   └── order-status.enum.ts
│
├── events/                   # [Domain Events] Events emitted by this module
│   └── order-created.event.ts
│
├── order.module.ts           # NestJS Module definition, provider registrations, exports
└── index.ts                  # Public API barrel file exposing only what other modules need
```

### Layer Rules
1. **Domain Layer**: Contains purest business rules, invariants, and entities. Zero framework dependencies.
2. **Application Layer (`services`)**: Coordinates use cases, loads entities, invokes domain logic, saves state, and dispatches events.
3. **Presentation Layer (`controllers`, `dtos`)**: Handles HTTP protocol, validates input with class-validator, delegates to application services, formats output.
4. **Infrastructure Layer (`repositories`)**: Implements database queries, caches, or external API calls via repository interfaces.

---

## 4. Inter-Module Communication Guidelines

To keep the monolith truly modular without high coupling:
1. **Direct Service Injections**:
   - Only import the specific module that exports the needed service.
   - Modules must **only expose public interfaces/services** via their root `index.ts`. Never deep-import another module's internal repository or private helpers.
2. **Asynchronous Decoupling (Domain Events)**:
   - For side effects (e.g., when an order is paid, sending confirmation email, reserving inventory, updating analytics), emit a domain event using `@nestjs/event-emitter`.
   - The `orders` module does not need direct dependency on `notifications` or `inventory`.
3. **Database Boundaries**:
   - Each module owns its tables/aggregates. Modules should avoid mutating tables owned by another bounded context directly.

