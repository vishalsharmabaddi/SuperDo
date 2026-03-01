package com.superdo.ai.service;

import com.superdo.ai.entity.User;
import com.superdo.ai.exception.ApiException;
import com.superdo.ai.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getRequiredUser(Long userId) {
        if (userId == null) {
            throw new ApiException("User id is required");
        }
        return userRepository.findById(userId)
                .orElseThrow(() -> new ApiException("User not found"));
    }
}
