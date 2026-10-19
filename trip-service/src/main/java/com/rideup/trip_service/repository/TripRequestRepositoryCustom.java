package com.rideup.trip_service.repository;

import com.rideup.trip_service.dto.request.MarketplaceTripRequestFilter;
import com.rideup.trip_service.entity.TripRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TripRequestRepositoryCustom {

    Page<TripRequest> getMarketplaceRequests(MarketplaceTripRequestFilter filter, Pageable pageable);
}
