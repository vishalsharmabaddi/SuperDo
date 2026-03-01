package com.superdo.ai.repository;

import com.superdo.ai.entity.CustomSectionEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CustomSectionEntryRepository extends JpaRepository<CustomSectionEntry, Long> {
    List<CustomSectionEntry> findByUserIdAndSectionIdOrderByUpdatedAtDesc(Long userId, Long sectionId);

    long deleteByUserIdAndSectionId(Long userId, Long sectionId);

    List<CustomSectionEntry> findByUserIdOrderByUpdatedAtDesc(Long userId);

    @Query("""
            SELECT e FROM CustomSectionEntry e
            WHERE e.user.id = :userId
              AND LOWER(e.dataJson) LIKE LOWER(CONCAT('%', :query, '%'))
            ORDER BY e.updatedAt DESC
            """)
    List<CustomSectionEntry> searchByUserId(@Param("userId") Long userId, @Param("query") String query);
}
