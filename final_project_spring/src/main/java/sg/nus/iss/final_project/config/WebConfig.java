package sg.nus.iss.final_project.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins("https://paperworth.vercel.app",
                        "https://magnificent-reverence-production.up.railway.app",
                        "https://paperworth.sgp1.digitaloceanspaces.com",
                        "http://localhost:4200", "http://localhost:8080",
                        "http://localhost",
                        "capacitor://localhost", "capacitor://paperworth.app", "capacitor://firebaseauth")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}