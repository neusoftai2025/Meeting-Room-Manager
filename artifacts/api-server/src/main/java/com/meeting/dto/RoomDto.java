package com.meeting.dto;

import com.meeting.entity.Room;

import java.time.OffsetDateTime;

public class RoomDto {
    private Integer id;
    private String name;
    private Integer capacity;
    private String location;
    private String description;
    private String amenities;
    private Boolean isActive;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public RoomDto() {}

    public static RoomDto from(Room room) {
        RoomDto dto = new RoomDto();
        dto.id = room.getId();
        dto.name = room.getName();
        dto.capacity = room.getCapacity();
        dto.location = room.getLocation();
        dto.description = room.getDescription();
        dto.amenities = room.getAmenities();
        dto.isActive = room.getIsActive();
        dto.createdAt = room.getCreatedAt();
        dto.updatedAt = room.getUpdatedAt();
        return dto;
    }

    public Integer getId() { return id; }
    public String getName() { return name; }
    public Integer getCapacity() { return capacity; }
    public String getLocation() { return location; }
    public String getDescription() { return description; }
    public String getAmenities() { return amenities; }
    public Boolean getIsActive() { return isActive; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
