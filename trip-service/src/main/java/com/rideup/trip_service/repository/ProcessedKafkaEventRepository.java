package com.rideup.trip_service.repository;

import com.rideup.trip_service.entity.ProcessedKafkaEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessedKafkaEventRepository extends JpaRepository<ProcessedKafkaEvent, String> {
}
