package com.meeting.service;

import com.meeting.entity.AppUser;
import com.meeting.entity.Reservation;
import com.meeting.entity.Room;
import com.meeting.repository.ReservationRepository;
import com.meeting.repository.RoomRepository;
import com.meeting.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.*;

@Service
public class SeedService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SeedService.class);

    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final ReservationRepository reservationRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);

    public SeedService(UserRepository userRepository, RoomRepository roomRepository,
                       ReservationRepository reservationRepository) {
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.reservationRepository = reservationRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) {
            log.info("Database already seeded, skipping.");
            return;
        }

        log.info("Seeding initial data...");
        String hash = passwordEncoder.encode("password123");

        AppUser admin = new AppUser();
        admin.setName("管理者"); admin.setEmail("admin@example.com");
        admin.setPasswordHash(hash); admin.setRole("admin");
        admin = userRepository.save(admin);

        AppUser user1 = new AppUser();
        user1.setName("田中 太郎"); user1.setEmail("tanaka@example.com");
        user1.setPasswordHash(hash); user1.setRole("user");
        user1 = userRepository.save(user1);

        AppUser user2 = new AppUser();
        user2.setName("鈴木 花子"); user2.setEmail("suzuki@example.com");
        user2.setPasswordHash(hash); user2.setRole("user");
        user2 = userRepository.save(user2);

        Room room1 = new Room();
        room1.setName("会議室A"); room1.setCapacity(10); room1.setLocation("3F 東館");
        room1.setDescription("プロジェクター完備の大会議室です");
        room1.setAmenities("プロジェクター, ホワイトボード, テレビ会議システム");
        room1 = roomRepository.save(room1);

        Room room2 = new Room();
        room2.setName("会議室B"); room2.setCapacity(6); room2.setLocation("3F 西館");
        room2.setDescription("少人数ミーティング向けの中会議室です");
        room2.setAmenities("ホワイトボード, モニター");
        room2 = roomRepository.save(room2);

        Room room3 = new Room();
        room3.setName("役員会議室"); room3.setCapacity(20); room3.setLocation("5F 役員フロア");
        room3.setDescription("重要会議・役員会議用の大型会議室です");
        room3.setAmenities("プロジェクター, ホワイトボード, テレビ会議システム, 大型モニター, 音響設備");
        room3 = roomRepository.save(room3);

        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        Reservation r1 = new Reservation();
        r1.setRoomId(room1.getId()); r1.setUserId(user1.getId());
        r1.setTitle("週次チームミーティング"); r1.setDescription("週次の定例チームミーティングです");
        r1.setStartTime(today.atTime(9, 0).atOffset(ZoneOffset.UTC));
        r1.setEndTime(today.atTime(10, 0).atOffset(ZoneOffset.UTC));
        r1.setAttendees(8); r1.setStatus("confirmed");
        reservationRepository.save(r1);

        Reservation r2 = new Reservation();
        r2.setRoomId(room2.getId()); r2.setUserId(user2.getId());
        r2.setTitle("プロジェクトレビュー"); r2.setDescription("Q1プロジェクトのレビュー");
        r2.setStartTime(today.atTime(13, 0).atOffset(ZoneOffset.UTC));
        r2.setEndTime(today.atTime(14, 30).atOffset(ZoneOffset.UTC));
        r2.setAttendees(5); r2.setStatus("confirmed");
        reservationRepository.save(r2);

        Reservation r3 = new Reservation();
        r3.setRoomId(room3.getId()); r3.setUserId(admin.getId());
        r3.setTitle("月次経営会議"); r3.setDescription("月次の経営陣によるビジネスレビュー");
        r3.setStartTime(today.atTime(15, 0).atOffset(ZoneOffset.UTC));
        r3.setEndTime(today.atTime(17, 0).atOffset(ZoneOffset.UTC));
        r3.setAttendees(15); r3.setStatus("confirmed");
        reservationRepository.save(r3);

        Reservation r4 = new Reservation();
        r4.setRoomId(room1.getId()); r4.setUserId(user1.getId());
        r4.setTitle("新人研修");
        r4.setStartTime(today.plusDays(1).atTime(10, 0).atOffset(ZoneOffset.UTC));
        r4.setEndTime(today.plusDays(1).atTime(12, 0).atOffset(ZoneOffset.UTC));
        r4.setAttendees(10); r4.setStatus("confirmed");
        reservationRepository.save(r4);

        log.info("Seed data inserted successfully.");
    }
}
