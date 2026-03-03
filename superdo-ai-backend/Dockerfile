# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /app

# Cache dependencies first (layer caching)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and build the fat JAR (skip tests — run them in CI separately)
COPY src ./src
RUN mvn package -DskipTests -B

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Non-root user for security
RUN addgroup -S superdo && adduser -S superdo -G superdo

COPY --from=builder /app/target/*.jar app.jar

RUN chown superdo:superdo app.jar
USER superdo

EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
