package com.meeting.dto;

public class DashboardSummaryDto {
    private long totalRooms;
    private long totalReservations;
    private long todayReservations;
    private long activeUsers;
    private long upcomingReservations;

    public DashboardSummaryDto(long totalRooms, long totalReservations,
                                long todayReservations, long activeUsers,
                                long upcomingReservations) {
        this.totalRooms = totalRooms;
        this.totalReservations = totalReservations;
        this.todayReservations = todayReservations;
        this.activeUsers = activeUsers;
        this.upcomingReservations = upcomingReservations;
    }

    public long getTotalRooms() { return totalRooms; }
    public long getTotalReservations() { return totalReservations; }
    public long getTodayReservations() { return todayReservations; }
    public long getActiveUsers() { return activeUsers; }
    public long getUpcomingReservations() { return upcomingReservations; }
}
