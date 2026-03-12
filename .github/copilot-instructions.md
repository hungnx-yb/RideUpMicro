# DuongXaChungLoi Monorepo – AI Coding Agent Instructions

## Architecture Overview

This is a multi-module Java monorepo (Spring Boot, Maven) for a microservices system:

- **api-gateway/**: Spring Cloud Gateway (port 8081). Routes requests to backend services, handles JWT validation via Keycloak. Config: [application.yaml](../api-gateway/src/main/resources/application.yaml).
- **discovery-server/**: Eureka service registry (port 8761). All services register here for service discovery.
- **keycloak-service/**: Auth facade for Keycloak (port 8083, `/api/auth`). Handles user CRUD and token exchange. See [keycloak-service/.github/copilot-instructions.md](../keycloak-service/.github/copilot-instructions.md) for deep details.
- **user-service/**: User management microservice. (Details not fully documented here.)

## Developer Workflows

- **Build/Run Any Service:**
  ```sh
  ./mvnw spring-boot:run -pl <module> [-am]
  # Example: ./mvnw spring-boot:run -pl api-gateway
  ```
- **Test:**
  ```sh
  ./mvnw test -pl <module>
  ```
- **All modules use Maven Wrapper (`mvnw`, `mvnw.cmd`) and Java 17+**
- **Keycloak**: Run with Docker Compose ([api-gateway/src/main/Docker/Keycloak/docker-compose.yml](../api-gateway/src/main/Docker/Keycloak/docker-compose.yml)).

## Project Conventions & Patterns

- **Service Registration:** All microservices register with Eureka at `localhost:8761/eureka` (see `eureka.client.service-url` in each `application.yaml`).
- **API Gateway Routing:**
  - Route config in [api-gateway/src/main/resources/application.yaml](../api-gateway/src/main/resources/application.yaml)
  - Example: `/api/users/**` → `user-service` via Eureka
- **Security:**
  - JWT validation via Keycloak public keys (see `issuer-uri` in each service's `application.yaml`)
  - Some services may have `.anyRequest().permitAll()` (see module-specific instructions)
- **Lombok:** Used for DTOs and service classes. Patterns: `@Data`, `@Builder`, `@RequiredArgsConstructor`
- **Validation:** Messages may be in Vietnamese (see `@Email(message = "Email không hợp lệ")`)
- **Error Handling:** Minimal, often just `RuntimeException` with a message.

## Integration & Cross-Service Communication

- **API Gateway** uses service names (Eureka) for routing, not hardcoded URLs.
- **Keycloak-service** integrates with Keycloak both via admin client and direct REST calls (see its own instructions).
- **Environment Variables:** Credentials and secrets are hardcoded in `application.yaml` for local/dev only.

## Key Files & Directories

- `api-gateway/src/main/resources/application.yaml`: Gateway routes, security, CORS
- `api-gateway/src/main/Docker/Keycloak/docker-compose.yml`: Local Keycloak setup
- `discovery-server/src/main/resources/application.yaml`: Eureka config
- `keycloak-service/.github/copilot-instructions.md`: Deep Keycloak integration details

## Quickstart Example

1. Start Eureka:
   ```sh
   ./mvnw spring-boot:run -pl discovery-server
   ```
2. Start Keycloak (Docker):
   ```sh
   docker compose -f api-gateway/src/main/Docker/Keycloak/docker-compose.yml up
   ```
3. Start API Gateway and other services as above.

---

**For Keycloak-specific conventions, see:** [keycloak-service/.github/copilot-instructions.md](../keycloak-service/.github/copilot-instructions.md)
