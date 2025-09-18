package com.oceanheart.passport.repository;

import com.oceanheart.passport.domain.Session;
import com.oceanheart.passport.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    /**
     * Find all sessions for a specific user
     */
    List<Session> findByUser(User user);

    /**
     * Find all sessions for a user by user ID
     */
    List<Session> findByUserId(UUID userId);

    /**
     * Find active sessions for a user (created within the last week)
     */
    @Query("SELECT s FROM Session s WHERE s.user = :user AND s.createdAt > :since")
    List<Session> findActiveSessionsByUser(@Param("user") User user, @Param("since") LocalDateTime since);

    /**
     * Find active sessions for a user by user ID
     */
    @Query("SELECT s FROM Session s WHERE s.user.id = :userId AND s.createdAt > :since")
    List<Session> findActiveSessionsByUserId(@Param("userId") UUID userId, @Param("since") LocalDateTime since);

    /**
     * Find session by ID and user (for security verification)
     */
    Optional<Session> findByIdAndUser(UUID sessionId, User user);

    /**
     * Find session by ID and user ID
     */
    Optional<Session> findByIdAndUserId(UUID sessionId, UUID userId);

    /**
     * Find sessions by IP address
     */
    List<Session> findByIpAddress(String ipAddress);

    /**
     * Find sessions created after a specific date
     */
    List<Session> findByCreatedAtAfter(LocalDateTime date);

    /**
     * Find sessions created between two dates
     */
    List<Session> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Find expired sessions (older than 1 week)
     */
    @Query("SELECT s FROM Session s WHERE s.createdAt < :expireTime")
    List<Session> findExpiredSessions(@Param("expireTime") LocalDateTime expireTime);

    /**
     * Count active sessions for a user
     */
    @Query("SELECT COUNT(s) FROM Session s WHERE s.user = :user AND s.createdAt > :since")
    long countActiveSessionsByUser(@Param("user") User user, @Param("since") LocalDateTime since);

    /**
     * Count total sessions for a user
     */
    long countByUser(User user);

    /**
     * Count total sessions by user ID
     */
    long countByUserId(UUID userId);

    /**
     * Delete all sessions for a user
     */
    @Modifying
    @Transactional
    void deleteByUser(User user);

    /**
     * Delete all sessions for a user by user ID
     */
    @Modifying
    @Transactional
    void deleteByUserId(UUID userId);

    /**
     * Delete expired sessions (cleanup operation)
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM Session s WHERE s.createdAt < :expireTime")
    void deleteExpiredSessions(@Param("expireTime") LocalDateTime expireTime);

    /**
     * Delete sessions created before a specific date
     */
    @Modifying
    @Transactional
    void deleteByCreatedAtBefore(LocalDateTime date);

    /**
     * Delete specific sessions by IDs
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM Session s WHERE s.id IN :sessionIds")
    void deleteByIds(@Param("sessionIds") List<UUID> sessionIds);

    /**
     * Find recent sessions for admin dashboard (last 24 hours)
     */
    @Query("SELECT s FROM Session s WHERE s.createdAt > :since ORDER BY s.createdAt DESC")
    List<Session> findRecentSessions(@Param("since") LocalDateTime since);

    /**
     * Find all sessions ordered by creation date (newest first)
     */
    List<Session> findAllByOrderByCreatedAtDesc();

    /**
     * Find sessions with specific user agent pattern
     */
    @Query("SELECT s FROM Session s WHERE s.userAgent LIKE %:pattern%")
    List<Session> findByUserAgentContaining(@Param("pattern") String pattern);

    /**
     * Get session statistics for admin dashboard
     */
    @Query("SELECT COUNT(s) FROM Session s WHERE s.createdAt > :since")
    long countSessionsCreatedSince(@Param("since") LocalDateTime since);

    /**
     * Find latest session for each user
     */
    @Query("SELECT s FROM Session s WHERE s.createdAt = (SELECT MAX(s2.createdAt) FROM Session s2 WHERE s2.user = s.user)")
    List<Session> findLatestSessionPerUser();

    /**
     * Update session's last accessed time
     */
    @Modifying
    @Transactional
    @Query("UPDATE Session s SET s.updatedAt = :now WHERE s.id = :sessionId")
    void updateLastAccessed(@Param("sessionId") UUID sessionId, @Param("now") LocalDateTime now);
}