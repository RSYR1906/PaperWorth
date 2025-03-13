# Stage 1: Build Spring Boot application
FROM maven:3.9.9-eclipse-temurin-23 AS maven-build

# Set working directory for Spring Boot
WORKDIR /app

# Copy Maven dependencies and install them
COPY final_project_spring/pom.xml ./
RUN mvn dependency:go-offline -B

# Copy the entire Spring Boot source code
COPY final_project_spring/ ./

# Build the Spring Boot application without running tests
RUN mvn clean package -DskipTests

# Stage 2: Final runtime image (Use lightweight JDK instead of Maven)
FROM eclipse-temurin:23-jdk

WORKDIR /app

# Copy the built JAR file from the build stage
COPY --from=maven-build /app/target/*.jar app.jar

# Expose the port (Railway automatically sets an internal port)
EXPOSE 8080

# Run the application
CMD ["java", "-jar", "/app/app.jar"]