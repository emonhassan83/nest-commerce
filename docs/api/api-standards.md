# API Standards & Conventions

## 1. URL Conventions
- RESTful resource naming using plural nouns: `/api/v1/orders`, `/api/v1/catalog/products`
- Global API prefix: `/api/v1`
- Use kebab-case for multi-word paths: `/api/v1/payment-methods`

## 2. Standard Response Envelope
All HTTP endpoints are intercepted by `src/common/interceptors/response.interceptor.ts` to output consistent JSON payloads:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Resource fetched successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2026-11-03T09:50:00.000Z"
}
```

## 3. Standard Error Envelope
All uncaught exceptions and HTTP exceptions are handled by `src/common/filters/http-exception.filter.ts`:

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "email must be a valid email address"
    }
  ],
  "path": "/api/v1/auth/register",
  "timestamp": "2026-11-03T09:50:00.000Z"
}
```

## 4. Input Validation & Serialization
- Use `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- All DTOs must use `class-validator` and `class-transformer`.
- Password and sensitive properties must never be returned in response objects (use `@Exclude()` or mapped response DTOs).

