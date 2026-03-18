You are a senior fullstack developer.

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



SYNC (Feign/REST) nên dùng cho:
Check driver hợp lệ.
Check trip tồn tại, đang mở bán.
Check seat available.
Giữ chỗ hoặc trừ ghế tạm thời ngay lúc đặt.
ASYNC (Event) nên dùng cho:
Gửi mail/SMS/push.
Ghi log/audit/analytics.
Đồng bộ sang hệ khác (BI, notification, history).
Điểm cần chỉnh:
Giảm ghế không nên chỉ async thuần.
Nếu giảm ghế async, dễ bị oversell khi nhiều user đặt cùng lúc.
Nên xử lý đồng bộ trong TripService bằng optimistic lock hoặc row lock để “reserve seat” ngay khi tạo booking.
Payment:
Nếu cần phản hồi đặt vé ngay: gọi payment sync để lấy trạng thái ban đầu (PENDING/SUCCESS/FAILED).
Sau đó dùng event để hoàn tất luồng (payment success -> confirm booking, payment fail/timeout -> release seat).