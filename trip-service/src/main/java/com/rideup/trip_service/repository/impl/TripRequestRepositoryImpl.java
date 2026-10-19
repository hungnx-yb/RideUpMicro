package com.rideup.trip_service.repository.impl;

import com.rideup.trip_service.dto.request.MarketplaceTripRequestFilter;
import com.rideup.trip_service.entity.TripRequest;
import com.rideup.trip_service.enums.TripRequestStatus;
import com.rideup.trip_service.repository.TripRequestRepositoryCustom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripRequestRepositoryImpl implements TripRequestRepositoryCustom {

    EntityManager entityManager;

    @Override
    public Page<TripRequest> getMarketplaceRequests(MarketplaceTripRequestFilter filter, Pageable pageable) {
        StringBuilder baseQuery = new StringBuilder("""
            FROM TripRequest t
            WHERE t.status = :status
            AND t.expiresAt > :now
            AND t.startProvinceId = :startProvinceId
            AND t.endProvinceId = :endProvinceId
        """);

        Map<String, Object> params = new HashMap<>();
        params.put("status", TripRequestStatus.OPEN);
        params.put("now", LocalDateTime.now());
        params.put("startProvinceId", filter.getStartProvinceId());
        params.put("endProvinceId", filter.getEndProvinceId());

        if (filter.getStartWardId() != null && !filter.getStartWardId().isBlank()) {
            baseQuery.append(" AND t.startWardId = :startWardId ");
            params.put("startWardId", filter.getStartWardId());
        }

        if (filter.getEndWardId() != null && !filter.getEndWardId().isBlank()) {
            baseQuery.append(" AND t.endWardId = :endWardId ");
            params.put("endWardId", filter.getEndWardId());
        }

        if (filter.getFromTime() != null) {
            baseQuery.append(" AND t.departureTime >= :fromTime ");
            params.put("fromTime", filter.getFromTime());
        }

        if (filter.getToTime() != null) {
            baseQuery.append(" AND t.departureTime <= :toTime ");
            params.put("toTime", filter.getToTime());
        }

        if (filter.getMinSeat() != null) {
            baseQuery.append(" AND t.seatTotal >= :minSeat ");
            params.put("minSeat", filter.getMinSeat());
        }

        TypedQuery<Long> countQuery = entityManager.createQuery("SELECT COUNT(t) " + baseQuery, Long.class);
        params.forEach(countQuery::setParameter);
        Long total = countQuery.getSingleResult();

        if (total == null || total == 0L) {
            return new PageImpl<>(List.of(), pageable != null ? pageable : Pageable.unpaged(), 0L);
        }

        TypedQuery<TripRequest> dataQuery = entityManager.createQuery(
                "SELECT t " + baseQuery + " ORDER BY t.departureTime ASC", TripRequest.class);
        params.forEach(dataQuery::setParameter);

        if (pageable != null && pageable.isPaged()) {
            dataQuery.setFirstResult((int) pageable.getOffset());
            dataQuery.setMaxResults(pageable.getPageSize());
        }

        List<TripRequest> result = dataQuery.getResultList();
        return new PageImpl<>(result, pageable != null ? pageable : Pageable.unpaged(), total);
    }
}
