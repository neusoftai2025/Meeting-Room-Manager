package com.meeting.controller;

import com.meeting.dto.CreateReservationRequest;
import com.meeting.dto.ReservationDto;
import com.meeting.dto.UpdateReservationRequest;
import com.meeting.entity.AppUser;
import com.meeting.entity.Reservation;
import com.meeting.entity.Room;
import com.meeting.repository.ReservationRepository;
import com.meeting.repository.RoomRepository;
import com.meeting.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class ReservationController {

    private final ReservationRepository reservationRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    public ReservationController(ReservationRepository reservationRepository,
                                  RoomRepository roomRepository,
                                  UserRepository userRepository) {
        this.reservationRepository = reservationRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/reservations")
    public ResponseEntity<?> listReservations(
        @RequestParam(required = false) Integer roomId,
        @RequestParam(required = false) Integer userId,
        @RequestParam(required = false) String date,
        @RequestParam(required = false) String startDate,
        @RequestParam(required = false) String endDate
    ) {
        OffsetDateTime startFrom = null;
        OffsetDateTime startTo = null;
        OffsetDateTime endTo = null;

        if (date != null && !date.isBlank()) {
            LocalDate d = LocalDate.parse(date);
            startFrom = d.atStartOfDay().atOffset(ZoneOffset.UTC);
            startTo = d.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
        } else {
            if (startDate != null && !startDate.isBlank()) {
                startFrom = LocalDate.parse(startDate).atStartOfDay().atOffset(ZoneOffset.UTC);
            }
            if (endDate != null && !endDate.isBlank()) {
                endTo = LocalDate.parse(endDate).atStartOfDay().atOffset(ZoneOffset.UTC);
            }
        }

        final OffsetDateTime fStartFrom = startFrom;
        final OffsetDateTime fStartTo = startTo;
        final OffsetDateTime fEndTo = endTo;

        List<Reservation> reservations = reservationRepository.findAllOrderByStartTime()
            .stream()
            .filter(r -> roomId == null || r.getRoomId().equals(roomId))
            .filter(r -> userId == null || r.getUserId().equals(userId))
            .filter(r -> fStartFrom == null || !r.getStartTime().isBefore(fStartFrom))
            .filter(r -> fStartTo == null || r.getStartTime().isBefore(fStartTo))
            .filter(r -> fEndTo == null || !r.getEndTime().isAfter(fEndTo))
            .toList();

        List<ReservationDto> result = reservations.stream()
            .map(r -> {
                Optional<Room> room = roomRepository.findById(r.getRoomId());
                Optional<AppUser> user = userRepository.findById(r.getUserId());
                if (room.isEmpty() || user.isEmpty()) return null;
                return ReservationDto.from(r, room.get(), user.get());
            })
            .filter(dto -> dto != null)
            .toList();

        return ResponseEntity.ok(result);
    }

    @PostMapping("/reservations")
    public ResponseEntity<?> createReservation(
        @RequestBody CreateReservationRequest req,
        HttpServletRequest request
    ) {
        HttpSession session = request.getSession(false);
        if (session == null || session.getAttribute("userId") == null) {
            return ResponseEntity.status(401).body(Map.of("error", "認証が必要です"));
        }
        Integer userId = (Integer) session.getAttribute("userId");

        if (req.getRoomId() == null || req.getTitle() == null || req.getStartTime() == null || req.getEndTime() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "必須項目を入力してください"));
        }

        List<Reservation> conflicts = reservationRepository.findConflicts(
            req.getRoomId(), req.getStartTime(), req.getEndTime());
        if (!conflicts.isEmpty()) {
            return ResponseEntity.status(409).body(Map.of("error", "指定した時間帯はすでに予約されています"));
        }

        Reservation r = new Reservation();
        r.setRoomId(req.getRoomId());
        r.setUserId(userId);
        r.setTitle(req.getTitle());
        r.setDescription(req.getDescription());
        r.setStartTime(req.getStartTime());
        r.setEndTime(req.getEndTime());
        r.setAttendees(req.getAttendees());
        r.setStatus("confirmed");

        Reservation saved = reservationRepository.save(r);

        Optional<Room> room = roomRepository.findById(saved.getRoomId());
        Optional<AppUser> user = userRepository.findById(saved.getUserId());
        if (room.isEmpty() || user.isEmpty()) {
            return ResponseEntity.status(500).body(Map.of("error", "データの取得に失敗しました"));
        }

        return ResponseEntity.status(201).body(ReservationDto.from(saved, room.get(), user.get()));
    }

    @GetMapping("/reservations/{id}")
    public ResponseEntity<?> getReservation(@PathVariable Integer id) {
        Optional<Reservation> rOpt = reservationRepository.findById(id);
        if (rOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "予約が見つかりません"));
        }
        Reservation r = rOpt.get();
        Optional<Room> room = roomRepository.findById(r.getRoomId());
        Optional<AppUser> user = userRepository.findById(r.getUserId());
        if (room.isEmpty() || user.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "予約が見つかりません"));
        }
        return ResponseEntity.ok(ReservationDto.from(r, room.get(), user.get()));
    }

    @PatchMapping("/reservations/{id}")
    public ResponseEntity<?> updateReservation(
        @PathVariable Integer id,
        @RequestBody UpdateReservationRequest req
    ) {
        Optional<Reservation> rOpt = reservationRepository.findById(id);
        if (rOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "予約が見つかりません"));
        }

        Reservation r = rOpt.get();

        Integer newRoomId = req.getRoomId() != null ? req.getRoomId() : r.getRoomId();
        OffsetDateTime newStart = req.getStartTime() != null ? req.getStartTime() : r.getStartTime();
        OffsetDateTime newEnd = req.getEndTime() != null ? req.getEndTime() : r.getEndTime();

        if (req.getRoomId() != null || req.getStartTime() != null || req.getEndTime() != null) {
            List<Reservation> conflicts = reservationRepository.findConflictsExcluding(
                newRoomId, newStart, newEnd, id);
            if (!conflicts.isEmpty()) {
                return ResponseEntity.status(409).body(Map.of("error", "指定した時間帯はすでに予約されています"));
            }
        }

        if (req.getRoomId() != null) r.setRoomId(req.getRoomId());
        if (req.getTitle() != null) r.setTitle(req.getTitle());
        if (req.getDescription() != null) r.setDescription(req.getDescription());
        if (req.getStartTime() != null) r.setStartTime(req.getStartTime());
        if (req.getEndTime() != null) r.setEndTime(req.getEndTime());
        if (req.getAttendees() != null) r.setAttendees(req.getAttendees());
        if (req.getStatus() != null) r.setStatus(req.getStatus());

        Reservation saved = reservationRepository.save(r);

        Optional<Room> room = roomRepository.findById(saved.getRoomId());
        Optional<AppUser> user = userRepository.findById(saved.getUserId());
        if (room.isEmpty() || user.isEmpty()) {
            return ResponseEntity.status(500).body(Map.of("error", "データの取得に失敗しました"));
        }

        return ResponseEntity.ok(ReservationDto.from(saved, room.get(), user.get()));
    }

    @DeleteMapping("/reservations/{id}")
    public ResponseEntity<?> deleteReservation(@PathVariable Integer id) {
        Optional<Reservation> rOpt = reservationRepository.findById(id);
        if (rOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "予約が見つかりません"));
        }
        reservationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
