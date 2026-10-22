package com.kietnewshub.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
        String username = request.username().trim().toLowerCase(java.util.Locale.ROOT);
        if (users.existsByUsernameIgnoreCase(username)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is already taken.");
        }
        HubUser user = users.save(new HubUser(username, request.displayName().trim(), passwordEncoder.encode(request.password())));
        return response(user);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        HubUser user = users.findByUsernameIgnoreCase(request.username().trim())
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid username or password."));
        if (user.isSuspended()) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This account is suspended.");
        return response(user);
    }

    private AuthResponse response(HubUser user) {
        return new AuthResponse(jwtService.issue(user), user.getId(), user.getUsername(), user.getDisplayName(), user.getRole().name());
    }

    public record RegisterRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9._]{3,30}") String username,
                                  @NotBlank @Size(min = 2, max = 90) String displayName,
                                  @NotBlank @Size(min = 6, max = 128) String password) {}
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record AuthResponse(String accessToken, Long userId, String username, String displayName, String role) {}
}