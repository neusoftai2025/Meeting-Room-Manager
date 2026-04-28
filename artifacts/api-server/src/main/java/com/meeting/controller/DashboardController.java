package com.meeting.controller;

import com.meeting.dto.DashboardSummaryDto;
import com.meeting.dto.ReservationDto;
import com.meeting.dto.RoomUtilizationDto;
import com.meeting.entity.AppUser;
import com.meeting.entity.Reservation;
import com.meeting.entity.Room;
import com.meeting.repository.ReservationRepository;
import com.meeting.repository.RoomRepository;
import com.meeting.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.*;
import java.util.List;
import java.util.Optional;

@RestController
public class DashboardController {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    public DashboardController(ReservationRepository reservationRepository,
                                RoomRepository roomRepository,
                                UserRepository userRepository) {
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard/summary")
    public DashboardSummaryDto summary() {
        long totalRooms = roomRepository.findByIsActiveTrueOrderByNameAsc().size();
        long totalReservations = reservationRepository.count();

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        LocalDate today = now.toLocalDate();
        OffsetDateTime dayStart = today.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime dayEnd = today.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        long todayReservations = reservationRepository.countTodayReservations(dayStart, dayEnd);
        long activeUsers = userRepository.count();
        long upcomingReservations = reservationRepository.countUpcomingReservations(now);

        return new DashboardSummaryDto(totalRooms, totalReservations, todayReservations, activeUsers, upcomingReservations);
    }

    @GetMapping("/dashboard/today")
    public List<ReservationDto> today() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        LocalDate today = now.toLocalDate();
        OffsetDateTime dayStart = today.atStartOfDay().atOffset(ZoneOffset.UTC);
        OffsetDateTime dayEnd = today.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);

        List<Reservation> reservations = reservationRepository.findTodayReservations(dayStart, dayEnd);

        return reservations.stream()
            .map(r -> {
                Optional<Room> room = roomRepository.findById(r.getRoomId());
                Optional<AppUser> user = userRepository.findById(r.getUserId());
                if (room.isEmpty() || user.isEmpty()) return null;
                return ReservationDto.from(r, room.get(), user.get());
            })
            .filter(dto -> dto != null)
            .toList();
    }

    @GetMapping("/dashboard/room-utilization")
    public List<RoomUtilizationDto> roomUtilization() {
        List<Room> rooms = roomRepository.findByIsActiveTrueOrderByNameAsc();

        return rooms.stream().map(room -> {
            List<Reservation> reservations = reservationRepository.findByRoomIdAndStatusConfirmed(room.getId());
            double totalHours = reservations.stream()
                .mapToDouble(r -> Duration.between(r.getStartTime(), r.getEndTime()).toMinutes() / 60.0)
                .sum();
            double rounded = Math.round(totalHours * 10.0) / 10.0;
            return new RoomUtilizationDto(room.getId(), room.getName(), reservations.size(), rounded);
        }).toList();
    }
}
