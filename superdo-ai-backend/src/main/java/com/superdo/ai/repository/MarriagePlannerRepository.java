package com.superdo.ai.repository;

import com.superdo.ai.entity.MarriagePlanner;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MarriagePlannerRepository extends JpaRepository<MarriagePlanner, Long> {

    List<MarriagePlanner> findByUserIdOrderByEventDateAsc(Long userId);

    @Query("""
            SELECT m FROM MarriagePlanner m
            WHERE m.user.id = :userId
              AND (
                    LOWER(m.eventName)    LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(m.guestName)    LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(m.vendorType)   LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(m.vendorName)   LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(m.timelineNote) LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY m.eventDate ASC
            """)
    List<MarriagePlanner> searchByUserId(@Param("userId") Long userId, @Param("query") String query);
}
