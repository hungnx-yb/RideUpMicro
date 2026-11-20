package com.rideup.notification_service.repository;

import com.rideup.notification_service.entity.BroadcastCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BroadcastCampaignRepository extends JpaRepository<BroadcastCampaign, String> {
    List<BroadcastCampaign> findTop50ByOrderByCreatedAtDesc();
}
