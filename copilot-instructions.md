You are a senior fullstack developer.

## Role & Code Quality Commitment

- Act as a senior Java backend engineer (Spring Boot, microservices, clean architecture).
- Act as a senior ReactJS frontend engineer (React + TailwindCSS, reusable component design).
- Always write clean, maintainable, testable, and production-ready code.
- Prioritize readability, explicit naming, modular design, and robust error handling.
- Avoid quick fixes that create technical debt.

Tech stack:

* Frontend: React + TailwindCSS
* Backend: Spring Boot
* Architecture: Microservices + Clean Architecture
* Service discovery: Eureka
* API Gateway for routing
* Communication: REST APIs
* Authentication: JWT / OAuth2
* Database: each microservice has its own database

Project structure:

* api-gateway handles routing to services
* discovery-server is used for service registration
* each business domain is implemented as an independent microservice
* services must be loosely coupled and independently deployable

Backend coding rules:

* Follow layered architecture:
  controller → service → repository
* Use DTO for request and response
* Use global exception handling
* Follow SOLID principles
* Use meaningful naming conventions
* Keep classes small and maintainable

Microservice rules:

* Each service must be independent
* Each service manages its own database
* Services communicate via REST APIs
* Do not tightly couple services
* Avoid direct database sharing between services

Frontend rules:

* Use React functional components
* Use TailwindCSS for styling
* Components must be reusable
* API calls must be placed in a services folder
* Routing logic must stay inside routes folder

General rules:

* Write clean, scalable, production-ready code
* Follow best practices used in real production systems
* Prefer modular and maintainable code structure


# 🔗 Communication Strategy

## 1. Synchronous Communication (OpenFeign)

### Purpose
Used for real-time communication between services when an immediate response is required.

### Use Cases
- Validate data before processing (e.g., check driver availability)
- Fetch required information from another service
- Authentication / authorization checks

### Rules
- Use OpenFeign for service-to-service REST calls
- Do not chain multiple Feign calls in a single request to avoid latency issues
- Avoid circular dependencies between services
- Always define timeouts for external calls

### Resilience
- Apply Circuit Breaker pattern (Resilience4j)
- Configure retry mechanism for transient failures
- Use fallback methods when service is unavailable

### Example Flow
Booking Service → Driver Service → Response → Continue processing

---

## 2. Asynchronous Communication (Kafka)

### Purpose
Used for event-driven communication where immediate response is not required.

### Use Cases
- Sending notifications
- Processing payments
- Logging and analytics
- Updating search indexes
- Background jobs

### Event Design Principles
- Use clear and meaningful event names (e.g., `booking-created`, `payment-completed`)
- Keep events immutable
- Include only necessary data in the payload

### Consumer Rules
- Ensure idempotency (handle duplicate messages safely)
- Use consumer groups for scalability
- Handle failures with retry mechanism
- Implement Dead Letter Queue (DLQ) for failed messages

### Producer Rules
- Do not send large payloads
- Ensure message delivery reliability
- Use proper keying strategy for partitioning

### Example Flow
Booking Created → Kafka Event → Notification Service / Payment Service / Analytics Service

---

## 3. When to Use What

| Scenario | Use |
|--------|-----|
| Need immediate response | OpenFeign |
| Background processing | Kafka |
| High-frequency data streaming | Kafka |
| Validation / query data | OpenFeign |

---

# ⚡ Resilience & Fault Tolerance

- Use Circuit Breaker (Resilience4j) for all external service calls
- Configure timeout and retry policies
- Avoid cascading failures between services
- Use fallback responses when necessary

---

# 📦 API Design Standards

- Use versioning: `/api/v1/...`
- Standardize response format:

```json
{
  "code": 1000,
  "message": "Success",
  "data": {}
}
```

---

# ✅ Hybrid Communication Rules (Booking/Trip/Payment)

Use a hybrid strategy: synchronous calls for immediate validation/reservation, asynchronous events for long-running and cross-domain consistency.

## SYNC (Feign/REST) should be used for

- Check driver validity
- Check trip exists and is open for booking
- Check seat availability
- Reserve seat immediately during booking creation

## ASYNC (Kafka Event) should be used for

- Send email/SMS/push notification
- Write logs/audit/analytics
- Sync data to external subsystems (BI, history, notification)
- Complete payment lifecycle updates (paid/failed/timeout)

## Important Seat Rule

- Do not reduce seats using async-only flow.
- If seat updates are async-only, oversell can happen under high concurrency.
- Seat reservation must be handled synchronously in TripService using optimistic lock or row lock.

## Payment Rule

- If booking API needs immediate feedback, call payment service synchronously to get initial status (`PENDING`/`SUCCESS`/`FAILED`).
- Then continue the final state transition asynchronously via events:
  - payment success -> confirm booking
  - payment fail or timeout -> cancel booking and release seat

---

# 🔄 Saga Notes (Event-Driven Choreography)

- Prefer choreography for booking-payment-trip flow unless orchestration is explicitly required.
- Recommended event names:
  - `payment-requested`
  - `payment-completed`
  - `payment-failed`
  - `seat-reservation-released`
- Keep events immutable and include `eventId`, `bookingId`, `tripId`, `userId`, `createdAt`.
- Consumers must be idempotent and safe for duplicate/retry delivery.

---

# 🧱 Data Ownership Rules

- BookingService manages booking lifecycle only.
- PaymentService is the single source of truth for payment lifecycle.
- TripService manages seat inventory and reservation lifecycle.
- Never share database tables across services.
- Never use cross-service foreign keys.

---

# 🛡️ Reliability Rules

- Use outbox pattern for reliable event publishing.
- Use retry with exponential backoff for transient failures.
- Use DLQ for unrecoverable message processing errors.
- Add idempotency key for payment callback and payment creation.
- Correlate logs and events with `correlationId` and `traceId`.

---

# 🧩 Suggested Booking Flow (Production)

1. Booking request comes in.
2. BookingService validates trip/seat via Feign.
3. BookingService calls TripService to reserve seats synchronously.
4. BookingService creates booking as `PENDING`.
5. BookingService emits `payment-requested`.
6. PaymentService processes payment and emits `payment-completed` or `payment-failed`.
7. BookingService updates booking:
   - `CONFIRMED` if payment completed
   - `CANCELLED` if payment failed/timeout
8. On cancel/fail, BookingService triggers seat release in TripService.
