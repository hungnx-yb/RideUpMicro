package com.rideup.trip_service.repository.impl;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.repository.TripRepositoryCustom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TripRepositoryImpl implements TripRepositoryCustom {

    EntityManager entityManager;


    @Override
    public Page<Trip> getAllTrips(String startWardId, String endWardId, LocalDate date, Pageable pageable) {
        StringBuilder baseQuery = new StringBuilder("""
            FROM trip t
            WHERE 1=1
        """);

        Map<String, Object> params = new HashMap<>();

        if (startWardId != null && !startWardId.isBlank()) {
            baseQuery.append("""
                AND EXISTS (
                    SELECT 1 FROM trip_stop ts
                    WHERE ts.trip_id = t.id
                      AND ts.stop_type = 'PICKUP'
                      AND ts.ward_id = :startWardId
                )
            """);
            params.put("startWardId", startWardId);
        }

        if (endWardId != null && !endWardId.isBlank()) {
            baseQuery.append("""
                AND EXISTS (
                    SELECT 1 FROM trip_stop ts
                    WHERE ts.trip_id = t.id
                      AND ts.stop_type = 'DROPOFF'
                      AND ts.ward_id = :endWardId
                )
            """);
            params.put("endWardId", endWardId);
        }

        if (date != null) {
            LocalDateTime startOfDay = date.atStartOfDay();
            LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

            baseQuery.append("""
                AND t.departure_time >= :startOfDay
                AND t.departure_time < :endOfDay
            """);

            params.put("startOfDay", startOfDay);
            params.put("endOfDay", endOfDay);
        }

        String countSql = "SELECT COUNT(*) " + baseQuery;
        Query countQuery = entityManager.createNativeQuery(countSql);
        params.forEach(countQuery::setParameter);

        Number total = (Number) countQuery.getSingleResult();

        String dataSql = "SELECT * " + baseQuery + " ORDER BY t.departure_time ASC";
        Query dataQuery = entityManager.createNativeQuery(dataSql, Trip.class);
        params.forEach(dataQuery::setParameter);

        if (pageable != null) {
            dataQuery.setFirstResult((int) pageable.getOffset());
            dataQuery.setMaxResults(pageable.getPageSize());
        }

        List<Trip> result = dataQuery.getResultList();

        return new PageImpl<>(
                result,
                pageable != null ? pageable : Pageable.unpaged(),
                total.longValue()
        );
    }
}