package com.meeting.repository;

import com.meeting.entity.Reservation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepository extends JpaRepository<Reservation, Integer> {

    @Query("SELECT r FROM Reservation r ORDER BY r.startTime ASC")
    List<Reservation> findAllOrderByStartTime();

    @Query("SELECT r FROM Reservation r WHERE " +
           "r.roomId = :roomId AND r.status = 'confirmed' AND " +
           "r.startTime < :endTime AND r.endTime > :startTime")
    List<Reservation> findConflicts(
        @Param("roomId") Integer roomId,
        @Param("startTime") OffsetDateTime startTime,
        @Param("endTime") OffsetDateTime endTime
    );

    @Query("SELECT r FROM Reservation r WHERE " +
           "r.roomId = :roomId AND r.status = 'confirmed' AND " +
           "r.id <> :excludeId AND " +
           "r.startTime < :endTime AND r.endTime > :startTime")
    List<Reservation> findConflictsExcluding(
        @Param("roomId") Integer roomId,
        @Param("startTime") OffsetDateTime startTime,
        @Param("endTime") OffsetDateTime endTime,
        @Param("excludeId") Integer excludeId
    );

    @Query("SELECT COUNT(r) FROM Reservation r WHERE " +
           "r.startTime >= :dayStart AND r.startTime < :dayEnd AND r.status = 'confirmed'")
    long countTodayReservations(
        @Param("dayStart") OffsetDateTime dayStart,
        @Param("dayEnd") OffsetDateTime dayEnd
    );

    @Query("SELECT COUNT(r) FROM Reservation r WHERE r.startTime >= :now AND r.status = 'confirmed'")
    long countUpcomingReservations(@Param("now") OffsetDateTime now);

    @Query("SELECT r FROM Reservation r WHERE " +
           "r.startTime >= :dayStart AND r.startTime < :dayEnd AND r.status = 'confirmed' " +
           "ORDER BY r.startTime ASC")
    List<Reservation> findTodayReservations(
        @Param("dayStart") OffsetDateTime dayStart,
        @Param("dayEnd") OffsetDateTime dayEnd
    );

    @Query("SELECT r FROM Reservation r WHERE r.roomId = :roomId AND r.status = 'confirmed'")
    List<Reservation> findByRoomIdAndStatusConfirmed(@Param("roomId") Integer roomId);
}
