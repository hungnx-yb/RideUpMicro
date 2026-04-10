package com.rideup.trip_service.repository.impl;
import com.rideup.trip_service.dto.request.SearchTripDriveRequest;
import com.rideup.trip_service.entity.Trip;
import com.rideup.trip_service.repository.TripRepositoryCustom;
import com.rideup.trip_service.utils.SecurityUtils;
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

    @Override
    public Page<Trip> searchDriveTrip(SearchTripDriveRequest filter) {
        String driverId= SecurityUtils.getCurrentUserId();
        StringBuilder baseQuery = new StringBuilder("""
            FROM trip t
            WHERE 1=1
            AND t.driver_id = :driverId 
        """);

        Map<String, Object> params = new HashMap<>();
        params.put("driverId", driverId);
        if (filter.getStartProvinceId() != null && !filter.getStartProvinceId().isBlank()) {
            params.put("startProvinceId", filter.getStartProvinceId());
            baseQuery.append("""
                AND t.start_province_id = :startProvinceId
            """);
        }


        if (filter.getEndProvinceId() != null && !filter.getEndProvinceId().isBlank()) {
            params.put("endProvinceId", filter.getEndProvinceId());
            baseQuery.append("""
                AND t.end_province_id = :endProvinceId
            """);
        }
        LocalDate startDate = filter.getStartDate();
        LocalDate endDate = filter.getEndDate();

        if (startDate != null && endDate != null && startDate.isAfter(endDate)) {
            LocalDate temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        if (startDate != null) {
            LocalDateTime startOfDay = startDate.atStartOfDay();
            params.put("startDate", startOfDay);
            baseQuery.append("""
                AND t.departure_time >= :startDate
            """);
        }

        if (endDate != null) {
            LocalDateTime endExclusive = endDate.plusDays(1).atStartOfDay();
            params.put("endDate", endExclusive);
            baseQuery.append("""
                AND t.departure_time < :endDate
            """);
        }
        String countSql = "SELECT COUNT(*) " + baseQuery;
        Query countQuery = entityManager.createNativeQuery(countSql);
        params.forEach(countQuery::setParameter);

        Number total = (Number) countQuery.getSingleResult();

        String dataSql = "SELECT * " + baseQuery + " ORDER BY t.departure_time DESC";
        Query dataQuery = entityManager.createNativeQuery(dataSql, Trip.class);
        params.forEach(dataQuery::setParameter);

        if (filter.getPageable() != null) {
            dataQuery.setFirstResult((int) filter.getPageable().getOffset());
            dataQuery.setMaxResults(filter.getPageable().getPageSize());
        }

        List<Trip> result = dataQuery.getResultList();
        return new PageImpl<>(
                result,
                filter.getPageable() != null ? filter.getPageable() : Pageable.unpaged(),
                total.longValue()
        );
    }
}