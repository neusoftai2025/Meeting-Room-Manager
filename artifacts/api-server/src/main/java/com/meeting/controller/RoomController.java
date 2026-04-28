package com.meeting.controller;

import com.meeting.dto.CreateRoomRequest;
import com.meeting.dto.RoomDto;
import com.meeting.dto.UpdateRoomRequest;
import com.meeting.entity.Room;
import com.meeting.repository.RoomRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
public class RoomController {

    private final RoomRepository roomRepository;

    public RoomController(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @GetMapping("/rooms")
    public List<RoomDto> listRooms() {
        return roomRepository.findAllByOrderByNameAsc()
            .stream().map(RoomDto::from).toList();
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody CreateRoomRequest req) {
        if (req.getName() == null || req.getName().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "会議室名を入力してください"));
        }
        if (req.getCapacity() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "定員を入力してください"));
        }
        if (req.getLocation() == null || req.getLocation().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "場所を入力してください"));
        }

        Room room = new Room();
        room.setName(req.getName());
        room.setCapacity(req.getCapacity());
        room.setLocation(req.getLocation());
        room.setDescription(req.getDescription());
        room.setAmenities(req.getAmenities());
        room.setIsActive(true);

        Room saved = roomRepository.save(room);
        return ResponseEntity.status(201).body(RoomDto.from(saved));
    }

    @GetMapping("/rooms/{id}")
    public ResponseEntity<?> getRoom(@PathVariable Integer id) {
        Optional<Room> roomOpt = roomRepository.findById(id);
        if (roomOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "会議室が見つかりません"));
        }
        return ResponseEntity.ok(RoomDto.from(roomOpt.get()));
    }

    @PatchMapping("/rooms/{id}")
    public ResponseEntity<?> updateRoom(@PathVariable Integer id, @RequestBody UpdateRoomRequest req) {
        Optional<Room> roomOpt = roomRepository.findById(id);
        if (roomOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "会議室が見つかりません"));
        }

        Room room = roomOpt.get();
        if (req.getName() != null) room.setName(req.getName());
        if (req.getCapacity() != null) room.setCapacity(req.getCapacity());
        if (req.getLocation() != null) room.setLocation(req.getLocation());
        if (req.getDescription() != null) room.setDescription(req.getDescription());
        if (req.getAmenities() != null) room.setAmenities(req.getAmenities());
        if (req.getIsActive() != null) room.setIsActive(req.getIsActive());

        Room saved = roomRepository.save(room);
        return ResponseEntity.ok(RoomDto.from(saved));
    }

    @DeleteMapping("/rooms/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable Integer id) {
        Optional<Room> roomOpt = roomRepository.findById(id);
        if (roomOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "会議室が見つかりません"));
        }
        roomRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
