# Nest Commerce

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="90" alt="Nest Logo" />
</p>

<p align="center">
  <strong>Enterprise-Grade E-Commerce Backend Engine</strong><br />
  Built with <strong>NestJS</strong>, <strong>TypeScript</strong>, <strong>Prisma</strong>, <strong>Redis</strong>, and <strong>PostgreSQL</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Modular%20Monolith-blue.svg" alt="Modular Monolith" />
  <img src="https://img.shields.io/badge/Pattern-Clean%20Architecture%20%26%20DDD-green.svg" alt="Clean Architecture & DDD" />
  <img src="https://img.shields.io/badge/Node-v20+-brightgreen.svg" alt="Node" />
  <img src="https://img.shields.io/badge/NestJS-v12+-ea2845.svg" alt="NestJS" />
  <img src="https://img.shields.io/badge/Prisma-ORM-1B222D.svg" alt="Prisma" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" />
</p>

---

## 🏛️ Architectural Overview

**Nest Commerce** is engineered as a **Modular Monolith** applying **Clean Architecture** principles and **Domain-Driven Design (DDD)** bounded contexts.

### Core Architectural Pillars
- **Modular Monolith**: Organized into self-contained bounded contexts (`identity`, `catalog`, `orders`, `payments`, etc.) that run within a single deployable unit.
- **Clean Architecture Layers**: Strict separation between Presentation (Controllers/DTOs), Application (Services/Use Cases), Domain (Entities/Value Objects/Rules), and Infrastructure (Database/External Services).
- **Domain-Driven Design (DDD)**: Rich domain models, explicit aggregate roots, repositories, and domain events.
- **Event-Driven Decoupling**: Inter-module side effects communicate asynchronously through Domain Events (`@nestjs/event-emitter` / Message Queues) rather than direct tight coupling.
- **Enterprise-Ready Infrastructure**: Centralized configurations, Redis caching, BullMQ job queues, structured logging, global response wrappers, and centralized exception filters.

Detailed architectural specifications are located in [docs/architecture/project-structure.md](file:///c:/bdcalling/explore/explore-tech/nest-commerce/docs/architecture/project-structure.md).

---

## 📂 Project Directory Structure

```text
nest-commerce/
│
├── src/
│   │
│   ├── main.ts                       # Application entry point & bootstrap configuration
│   ├── app.module.ts                 # Root application module assembling core infrastructure & domain modules
│   │
│   ├── config/                       # Centralized type-safe environment configuration
│   │   ├── app.config.ts             # Application runtime settings (port, prefix, cors)
│   │   ├── database.config.ts        # Database connection settings
│   │   ├── redis.config.ts           # Redis caching & queue settings
│   │   ├── jwt.config.ts             # Auth tokens, expiry, & secret keys
│   │   └── payment.config.ts         # Payment gateway configurations
│   │
│   ├── common/                       # Framework-wide shared utilities & cross-cutting components
│   │   ├── decorators/               # Custom decorators (@CurrentUser, @Public, @Permissions)
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── public.decorator.ts
│   │   │   └── permissions.decorator.ts
│   │   │
│   │   ├── guards/                   # Route guards (Authentication, RBAC, Permissions)
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── permissions.guard.ts
│   │   │
│   │   ├── filters/                  # Exception sanitizers and standardized error payloads
│   │   │   └── http-exception.filter.ts
│   │   │
│   │   ├── interceptors/             # Response serialization & request tracing
│   │   │   ├── response.interceptor.ts
│   │   │   └── logging.interceptor.ts
│   │   │
│   │   ├── pipes/                    # Input transformation & validation pipes
│   │   ├── exceptions/               # Custom enterprise domain exceptions
│   │   ├── constants/                # System constants, token symbols, cache keys
│   │   ├── enums/                    # System-wide enum definitions
│   │   └── utils/                    # Pure utility and cryptographic helpers
│   │
│   ├── infrastructure/               # Low-level external technical adapters
│   │   ├── database/                 # Prisma client lifecycle and Unit of Work transactions
│   │   │   ├── database.module.ts
│   │   │   ├── prisma.service.ts
│   │   │   └── transaction.service.ts
│   │   │
│   │   ├── cache/                    # Redis caching provider
│   │   │   ├── cache.module.ts
│   │   │   └── redis.service.ts
│   │   │
│   │   ├── queue/                    # Asynchronous BullMQ background worker queues
│   │   │   ├── queue.module.ts
│   │   │   └── processors/
│   │   │
│   │   ├── storage/                  # Object storage providers (S3 / R2 / MinIO)
│   │   │   ├── storage.module.ts
│   │   │   └── s3-storage.service.ts
│   │   │
│   │   ├── email/                    # Transactional mail delivery integrations
│   │   ├── sms/                      # SMS gateway integration
│   │   ├── payments/                 # External payment provider adapters
│   │   └── messaging/                # Distributed event bus & broker adapters
│   │
│   ├── modules/                      # Business Bounded Contexts (Core Domains)
│   │   ├── identity/                 # Auth, JWT, refresh tokens, MFA, password reset
│   │   ├── users/                    # User accounts, profiles, addresses
│   │   ├── sellers/                  # Multi-vendor merchant profiles & stores
│   │   ├── catalog/                  # Products, variants, attributes, brands
│   │   ├── categories/               # Taxonomy, category trees & navigation
│   │   ├── inventory/                # Stock levels, warehouse allocation & reservations
│   │   ├── pricing/                  # Price lists, tier pricing & discount calculations
│   │   ├── cart/                     # Shopping carts & guest cart persistence
│   │   ├── orders/                   # Order placement, lifecycle state machine, fulfillment
│   │   ├── payments/                 # Payment intents, transactions, webhooks & refunds
│   │   ├── shipping/                 # Carriers, shipping zones, rates & label tracking
│   │   ├── reviews/                  # Customer ratings, reviews & moderation
│   │   ├── promotions/               # Coupons, discount vouchers & promotional campaigns
│   │   ├── search/                   # Full-text indexing & search integration
│   │   ├── notifications/            # Push notifications, emails, alerts
│   │   ├── admin/                    # Platform administration & audit logging
│   │   └── analytics/                # Business metrics, revenue, sales analytics
│   │
│   ├── events/                       # Domain & Integration Event Contracts
│   │   ├── domain/                   # Internal domain events
│   │   └── integration/              # Cross-boundary & external integration events
│   │
│   ├── health/                       # Health check endpoints & system readiness probes
│   │   ├── health.module.ts
│   │   └── health.controller.ts
│   │
│   └── app.module.ts
│
├── prisma/                           # Database Schema & Migrations
│   ├── schema.prisma                 # Primary data model
│   ├── migrations/                   # SQL migration tracking history
│   └── seed.ts                       # Database seeding script for local environments
│
├── test/                             # Automated Test Suites
│   ├── integration/                  # Cross-module integration tests
│   ├── e2e/                          # End-to-end API testing
│   └── fixtures/                     # Test factories and mock datasets
│
├── scripts/                          # Automation, deployment, and seed scripts
├── docs/                             # Engineering Architecture & Guidelines
│   ├── architecture/                 # Architecture designs & DDD specifications
│   ├── api/                          # REST API conventions & OpenAPI specs
│   └── decisions/                    # Architecture Decision Records (ADRs)
│
├── .env.example                      # Documented environment variable template
├── .gitignore                        # Git exclusion rules
├── Dockerfile                        # Multi-stage production container build
├── docker-compose.yml                # Local infrastructure (PostgreSQL, Redis, MinIO)
├── nest-cli.json                     # NestJS CLI configuration
├── package.json                      # Dependency manifests and scripts
├── tsconfig.json                     # TypeScript configuration
└── README.md                         # Project documentation
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `pnpm` (recommended) or `npm`
- **Docker & Docker Compose**: For local PostgreSQL, Redis, etc.

### 2. Environment Setup
Copy the environment template and adjust configuration values:
```bash
cp .env.example .env
```

### 3. Install Dependencies
```bash
pnpm install
```

### 4. Start Infrastructure Containers
```bash
docker-compose up -d
```

### 5. Run Database Migrations & Seeds
```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

### 6. Start Development Server
```bash
pnpm run start:dev
```
The server will be available at `http://localhost:3000/api/v1`.

---

## 🛠️ Nest CLI Commands Reference Guide

The **Nest CLI** (`@nestjs/cli`) is used for generating code, scaffolding modules, building, and running the application.

### 1. Application Lifecycle Commands

| Action | Command | Description |
| :--- | :--- | :--- |
| **Start (Dev Watch)** | `pnpm nest start --watch` (or `pnpm run start:dev`) | Starts app with HMR / auto-reload on file changes |
| **Start (Debug)** | `pnpm nest start --debug --watch` | Starts app with Node.js inspector attached |
| **Build** | `pnpm nest build` | Compiles TypeScript into the `dist/` directory |
| **Start (Prod)** | `pnpm run start:prod` | Runs compiled code from `dist/main.js` |
| **CLI Info** | `pnpm nest info` | Displays Nest CLI, Node, OS, and package details |

---

### 2. Code Generation & Scaffolding Commands

Use the syntax: `nest generate <schematic> <name> [options]` (or alias `nest g <schematic> <name>`).

#### A. Scaffolding Modules
Generate a self-contained module in `src/modules/`:
```bash
# Generate a new domain module (e.g. Catalog module)
pnpm nest g module modules/catalog --flat=false

# Generate an infrastructure module (e.g. Storage module)
pnpm nest g module infrastructure/storage --flat=false
```

#### B. Generating Controllers & Services
Generate controllers and application services inside a specific module:
```bash
# Generate Controller inside catalog module (without flat files)
pnpm nest g controller modules/catalog/controllers/catalog --flat=false --no-spec

# Generate Service inside catalog module
pnpm nest g service modules/catalog/services/catalog --flat=false --no-spec
```

#### C. Generating Complete REST Resources
Generates Controller, Service, Module, DTOs, and Entity skeletons in one interactive step:
```bash
pnpm nest g resource modules/orders
```

#### D. Generating Common Layer Components
Generate shared cross-cutting guards, interceptors, filters, decorators, and pipes inside `src/common/`:
```bash
# Guard (Authentication / Permissions)
pnpm nest g guard common/guards/jwt-auth --no-spec

# Interceptor (Response formatting / Logging)
pnpm nest g interceptor common/interceptors/response --no-spec

# Exception Filter
pnpm nest g filter common/filters/http-exception --no-spec

# Pipe (Custom validation / sanitization)
pnpm nest g pipe common/pipes/validation --no-spec

# Decorator (Custom param or method decorators)
pnpm nest g decorator common/decorators/current-user --no-spec
```

#### E. Frequently Used Nest CLI Options & Flags
- `--dry-run` or `-d`: Preview changes without writing files to disk.
  ```bash
  pnpm nest g module modules/payments --dry-run
  ```
- `--no-spec`: Skip generating `.spec.ts` test files.
- `--flat=false`: Enforces creating a dedicated folder for the generated element.
- `--no-flat`: Equivalent to `--flat=false`.

---

## 🗄️ Database & Prisma Commands

```bash
# Apply pending migrations in development
pnpm prisma migrate dev --name <migration_name>

# Deploy migrations in production / CI
pnpm prisma migrate deploy

# Generate Prisma Client after schema changes
pnpm prisma generate

# Inspect & edit database data via visual UI
pnpm prisma studio

# Seed the database
pnpm prisma db seed
```

---

## 🧪 Testing & Code Quality

```bash
# Run unit tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run end-to-end (e2e) tests
pnpm run test:e2e

# Generate test coverage report
pnpm run test:cov

# Run fast Oxlint linter
pnpm run lint

# Format code with Prettier
pnpm run format
```

---

## 📚 Documentation Index

- [Architecture & Project Structure Specification](file:///c:/bdcalling/explore/explore-tech/nest-commerce/docs/architecture/project-structure.md)
- [API Conventions & Payload Standards](file:///c:/bdcalling/explore/explore-tech/nest-commerce/docs/api/api-standards.md)
- [ADR 0001: Modular Monolith with DDD & Clean Architecture](file:///c:/bdcalling/explore/explore-tech/nest-commerce/docs/decisions/0001-modular-monolith-architecture.md)

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
