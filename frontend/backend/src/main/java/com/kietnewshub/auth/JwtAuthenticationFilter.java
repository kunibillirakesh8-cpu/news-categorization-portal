package com.kietnewshub.auth;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final HubUserRepository users;

    public JwtAuthenticationFilter(JwtService jwtService, HubUserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = jwtService.parse(header.substring(7));
                HubUser user = users.findByEmailIgnoreCase(claims.getSubject())
                    .filter(candidate -> !candidate.isSuspended())
                    .orElseThrow();
                var authentication = new UsernamePasswordAuthenticationToken(
                    user.getEmail(), null, List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (RuntimeException exception) {
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }
}