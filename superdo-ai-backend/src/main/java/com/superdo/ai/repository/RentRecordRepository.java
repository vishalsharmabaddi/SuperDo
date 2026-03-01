package com.superdo.ai.repository;

import com.superdo.ai.entity.RentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RentRecordRepository extends JpaRepository<RentRecord, Long> {

    List<RentRecord> findByUserIdOrderByDueDateAsc(Long userId);

    @Query("""
            SELECT r FROM RentRecord r
            WHERE r.user.id = :userId
              AND (
                    LOWER(r.tenantName)   LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(r.landlordName) LIKE LOWER(CONCAT('%', :query, '%'))
                 OR LOWER(r.notes)        LIKE LOWER(CONCAT('%', :query, '%'))
              )
            ORDER BY r.dueDate ASC
            """)
    List<RentRecord> searchByUserId(@Param("userId") Long userId, @Param("query") String query);
}
