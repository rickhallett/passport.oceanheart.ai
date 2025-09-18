package com.oceanheart.passport.repository;

import com.oceanheart.passport.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    /**
     * Find user by email address (case-insensitive)
     * Required for authentication
     */
    Optional<User> findByEmailAddress(String emailAddress);

    /**
     * Find user by email address ignoring case
     */
    Optional<User> findByEmailAddressIgnoreCase(String emailAddress);

    /**
     * Check if user exists by email address
     */
    boolean existsByEmailAddress(String emailAddress);

    /**
     * Check if user exists by email address ignoring case
     */
    boolean existsByEmailAddressIgnoreCase(String emailAddress);

    /**
     * Find all users with admin role
     */
    List<User> findByRole(User.Role role);

    /**
     * Find all admin users
     */
    @Query("SELECT u FROM User u WHERE u.role = 'ADMIN'")
    List<User> findAllAdmins();

    /**
     * Find users created after a specific date
     */
    List<User> findByCreatedAtAfter(LocalDateTime date);

    /**
     * Find users created between two dates
     */
    List<User> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end);

    /**
     * Count total number of users
     */
    @Query("SELECT COUNT(u) FROM User u")
    long countAllUsers();

    /**
     * Count users by role
     */
    long countByRole(User.Role role);

    /**
     * Find users with active sessions
     */
    @Query("SELECT DISTINCT u FROM User u JOIN u.sessions s WHERE s.createdAt > :since")
    List<User> findUsersWithActiveSessionsSince(@Param("since") LocalDateTime since);

    /**
     * Find users ordered by creation date (newest first)
     */
    List<User> findAllByOrderByCreatedAtDesc();

    /**
     * Find users ordered by last update (most recently updated first)
     */
    List<User> findAllByOrderByUpdatedAtDesc();

    /**
     * Search users by email pattern
     */
    @Query("SELECT u FROM User u WHERE u.emailAddress LIKE %:pattern%")
    List<User> findByEmailAddressContaining(@Param("pattern") String pattern);

    /**
     * Find users without any sessions
     */
    @Query("SELECT u FROM User u WHERE u.sessions IS EMPTY")
    List<User> findUsersWithoutSessions();

    /**
     * Delete users created before a specific date (for cleanup)
     */
    void deleteByCreatedAtBefore(LocalDateTime date);
}