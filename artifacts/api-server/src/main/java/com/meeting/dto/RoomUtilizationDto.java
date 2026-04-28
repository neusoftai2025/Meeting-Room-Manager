package com.meeting.dto;

public class RoomUtilizationDto {
    private Integer roomId;
    private String roomName;
    private int reservationCount;
    private double totalHours;

    public RoomUtilizationDto(Integer roomId, String roomName, int reservationCount, double totalHours) {
        this.roomId = roomId;
        this.roomName = roomName;
        this.reservationCount = reservationCount;
        this.totalHours = totalHours;
    }

    public Integer getRoomId() { return roomId; }
    public String getRoomName() { return roomName; }
    public int getReservationCount() { return reservationCount; }
    public double getTotalHours() { return totalHours; }
}
