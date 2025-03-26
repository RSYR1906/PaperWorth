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
                        "www.rsyr.online",
                        "https://magnificent-reverence-production.up.railway.app",
                        "https://paperworth.sgp1.digitaloceanspaces.com",
                        "http://localhost:4200",
                        "http://localhost:8080",
                        // Capacitor Android domains
                        "http://localhost:8100", // Default Capacitor dev server
                        "capacitor://localhost", // Capacitor app scheme
                        "ionic://localhost", // Ionic scheme if you're using Ionic
                        "http://10.0.2.2:8100", // Android emulator accessing localhost
                        "http://192.168.1.0/24" // Common local IP range for testing on devices
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
    }
}