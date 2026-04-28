package com.meeting.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.meeting.entity.AppUser;

import java.time.OffsetDateTime;

public class UserDto {
    private Integer id;
    private String name;
    private String email;
    private String role;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public UserDto() {}

    public static UserDto from(AppUser user) {
        UserDto dto = new UserDto();
        dto.id = user.getId();
        dto.name = user.getName();
        dto.email = user.getEmail();
        dto.role = user.getRole();
        dto.createdAt = user.getCreatedAt();
        dto.updatedAt = user.getUpdatedAt();
        return dto;
    }

    public Integer getId() { return id; }
    public String getName() { return name; }
    public String getEmail() { return email; }
    public String getRole() { return role; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
}
