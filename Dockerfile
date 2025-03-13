FROM node:18 AS angular-build

# Set working directory for Angular
WORKDIR /app/angular

# Copy Angular application files
COPY final_project_angular/package*.json ./
RUN npm install

# Copy source code
COPY final_project_angular/ ./

# Build Angular app
RUN npm run build -- --configuration production

# Use Maven to build Spring Boot app
FROM maven:3.9.5-eclipse-temurin-21-alpine AS maven-build

# Set working directory for Spring Boot
WORKDIR /app/spring

# Copy pom.xml and download dependencies
COPY final_project_spring/pom.xml ./
RUN mvn dependency:go-offline -B

# Copy source code and the Angular build output
COPY final_project_spring/src ./src/
COPY --from=angular-build /app/angular/dist/final_project_angular/ ./src/main/resources/static/

# Package the application
RUN mvn package -DskipTests

# Final stage: Setup runtime environment
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Copy the jar file from Maven stage
COPY --from=maven-build /app/spring/target/*.jar app.jar

# Create directory for Google credentials
RUN mkdir -p /app/config

# Environment variable for Google Cloud API credentials
ENV GOOGLE_CLOUD_CREDENTIALS_PATH=/app/config/google-credentials.json

# Expose the port your application will run on
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "/app/app.jar"]