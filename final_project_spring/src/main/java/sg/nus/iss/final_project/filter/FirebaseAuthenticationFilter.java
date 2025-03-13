package sg.nus.iss.final_project.filter;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private FirebaseAuth firebaseAuth;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Skip authentication for login and public endpoints
        String path = request.getRequestURI();
        if (request.getMethod().equals("OPTIONS") ||
                path.contains("/public/") ||
                path.contains("/login") ||
                path.contains("/firebase-auth")) {
            filterChain.doFilter(request, response);
            return;
        }

        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith("Bearer ")) {
            String idToken = authorizationHeader.substring(7);
            try {
                FirebaseToken decodedToken = firebaseAuth.verifyIdToken(idToken);
                // You can set the user information in request attributes if needed
                request.setAttribute("uid", decodedToken.getUid());
                request.setAttribute("email", decodedToken.getEmail());

                filterChain.doFilter(request, response);
                return;
            } catch (FirebaseAuthException e) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Invalid token");
                return;
            }
        }

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write("Authentication required");
    }
}