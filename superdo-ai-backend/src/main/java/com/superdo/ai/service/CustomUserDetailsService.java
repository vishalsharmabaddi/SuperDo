package com.superdo.ai.service;

import com.superdo.ai.repository.UserRepository;
import com.superdo.ai.security.UserPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Locale;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) {
        return userRepository.findByEmail(username.toLowerCase(Locale.ROOT).trim())
                .map(UserPrincipal::create)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
}
