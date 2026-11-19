# syntax=docker/dockerfile:1

# Both Maven and Temurin images publish linux/amd64 and linux/arm64 variants.
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -ntp dependency:go-offline
COPY src ./src
RUN mvn -B -ntp clean package

# Non-Alpine runtime: supports AMD64 and Apple Silicon (ARM64).
FROM eclipse-temurin:17-jre
WORKDIR /app
# curl is used by the Compose healthcheck; no wget dependency on the base image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appgroup \
    && useradd -r -g appgroup -s /usr/sbin/nologin appuser
COPY --from=build /workspace/target/backend-0.0.1-SNAPSHOT.jar /app/backend.jar
USER appuser:appgroup
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"
ENTRYPOINT ["java", "-jar", "/app/backend.jar"]
