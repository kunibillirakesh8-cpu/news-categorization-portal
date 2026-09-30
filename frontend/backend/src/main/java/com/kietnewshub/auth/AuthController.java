package com.kietnewshub.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final HubUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthController(HubUserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        if (users.existsByEmailIgnoreCase(request.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        HubUser user = users.save(new HubUser(
                request.email().trim().toLowerCase(), request.displayName().trim(), passwordEncoder.encode(request.password())));
        return response(user);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        HubUser user = users.findByEmailIgnoreCase(request.email().trim())
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password."));
        if (user.isSuspended()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is suspended.");
        return response(user);
    }

    private AuthResponse response(HubUser user) {
        return new AuthResponse(jwtService.issue(user), user.getId(), user.getDisplayName(), user.getRole().name());
    }

    public record RegisterRequest(@Email @NotBlank String email, @NotBlank @Size(min = 2, max = 90) String displayName,
                                  @NotBlank @Size(min = 12, max = 128) String password) {}
    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
    public record AuthResponse(String accessToken, Long userId, String displayName, String role) {}
}