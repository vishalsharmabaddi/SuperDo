package com.superdo.ai.repository;

import com.superdo.ai.entity.CustomSection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CustomSectionRepository extends JpaRepository<CustomSection, Long> {
    List<CustomSection> findByUserIdOrderByUpdatedAtDesc(Long userId);
}