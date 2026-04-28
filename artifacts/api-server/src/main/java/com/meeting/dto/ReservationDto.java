package com.meeting.dto;

import com.meeting.entity.AppUser;
import com.meeting.entity.Reservation;
import com.meeting.entity.Room;

import java.time.OffsetDateTime;

public class ReservationDto {
    private Integer id;
    private Integer roomId;
    private Integer userId;
    private String title;
    private String description;
    private OffsetDateTime startTime;
    private OffsetDateTime endTime;
    private Integer attendees;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
    private RoomDto room;
    private UserDto user;

    public ReservationDto() {}

    public static ReservationDto from(Reservation r, Room room, AppUser user) {
        ReservationDto dto = new ReservationDto();
        dto.id = r.getId();
        dto.roomId = r.getRoomId();
        dto.userId = r.getUserId();
        dto.title = r.getTitle();
        dto.description = r.getDescription();
        dto.startTime = r.getStartTime();
        dto.endTime = r.getEndTime();
        dto.attendees = r.getAttendees();
        dto.status = r.getStatus();
        dto.createdAt = r.getCreatedAt();
        dto.updatedAt = r.getUpdatedAt();
        dto.room = RoomDto.from(room);
        dto.user = UserDto.from(user);
        return dto;
    }

    public Integer getId() { return id; }
    public Integer getRoomId() { return roomId; }
    public Integer getUserId() { return userId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public OffsetDateTime getStartTime() { return startTime; }
    public OffsetDateTime getEndTime() { return endTime; }
    public Integer getAttendees() { return attendees; }
    public String getStatus() { return status; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public RoomDto getRoom() { return room; }
    public UserDto getUser() { return user; }
}
