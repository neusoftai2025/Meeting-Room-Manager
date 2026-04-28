package com.meeting.repository;

import com.meeting.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoomRepository extends JpaRepository<Room, Integer> {
    List<Room> findAllByOrderByNameAsc();
    List<Room> findByIsActiveTrueOrderByNameAsc();
}
