package com.superdo.ai.repository;

import com.superdo.ai.entity.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NoteRepository extends JpaRepository<Note, Long> {

    List<Note> findByUserIdOrderByUpdatedAtDesc(Long userId);

    long countByUserId(Long userId);

    /**
     * Full-text search across title, content, and tags in a single query.
     * Using a single JPQL predicate avoids the duplicate-userId bug present
     * in the derived-query version with OR between different userId bindings.
     */
    @Query("""
            SELECT n FROM Note n
            WHERE n.user.id = :userId
              AND (
                    LOWER(n.title)   LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(n.content) LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(n.tags)    LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY n.updatedAt DESC
            """)
    List<Note> searchByUserId(@Param("userId") Long userId, @Param("query") String query);
}
