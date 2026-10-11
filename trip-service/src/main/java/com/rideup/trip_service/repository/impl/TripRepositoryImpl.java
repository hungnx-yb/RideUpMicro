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
    public Page<Trip> getAllTrips(String startProvinceId, String startWardId, String endProvinceId, String endWardId, LocalDate date, Pageable pageable) {
        StringBuilder baseQuery = new StringBuilder("""
            FROM trip t
            WHERE 1=1
        """);

        Map<String, Object> params = new HashMap<>();

        if (startProvinceId != null && !startProvinceId.isBlank()) {
            baseQuery.append("""
                AND t.start_province_id = :startProvinceId
            """);
            params.put("startProvinceId", startProvinceId);
        }

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

        if (endProvinceId != null && !endProvinceId.isBlank()) {
            baseQuery.append("""
                AND t.end_province_id = :endProvinceId
            """);
            params.put("endProvinceId", endProvinceId);
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

        LocalDateTime now = LocalDateTime.now();
        if (date != null) {
            LocalDate queryDate = date.isBefore(LocalDate.now()) ? LocalDate.now() : date;
            LocalDateTime startOfDay = queryDate.equals(LocalDate.now()) ? now : queryDate.atStartOfDay();
            LocalDateTime endOfDay = queryDate.plusDays(1).atStartOfDay();

            baseQuery.append("""
                AND t.departure_time >= :startOfDay
                AND t.departure_time < :endOfDay
            """);

            params.put("startOfDay", startOfDay);
            params.put("endOfDay", endOfDay);
        } else {
            baseQuery.append("""
                AND t.departure_time >= :todayStart
            """);
            params.put("todayStart", now);
        }

        baseQuery.append("""
            AND t.status IN ('OPEN', 'FULL')
        """);

        String countSql = "SELECT COUNT(*) " + baseQuery;
        Query countQuery = entityManager.createNativeQuery(countSql);
        params.forEach(countQuery::setParameter);

        Number total = (Number) countQuery.getSingleResult();

        String dataSql = "SELECT * " + baseQuery + " ORDER BY t.created_at DESC";
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

        if (filter.getPickupAddress() != null && !filter.getPickupAddress().isBlank()) {
            params.put("pickupAddress", "%" + filter.getPickupAddress().trim() + "%");
            baseQuery.append("""
                AND (t.start_address_text LIKE :pickupAddress OR EXISTS (
                    SELECT 1 FROM trip_stop ts WHERE ts.trip_id = t.id AND ts.stop_type = 'PICKUP' AND ts.address_text LIKE :pickupAddress
                ))
            """);
        }

        if (filter.getDropoffAddress() != null && !filter.getDropoffAddress().isBlank()) {
            params.put("dropoffAddress", "%" + filter.getDropoffAddress().trim() + "%");
            baseQuery.append("""
                AND (t.end_address_text LIKE :dropoffAddress OR EXISTS (
                    SELECT 1 FROM trip_stop ts WHERE ts.trip_id = t.id AND ts.stop_type = 'DROPOFF' AND ts.address_text LIKE :dropoffAddress
                ))
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

        String dataSql = "SELECT * " + baseQuery + " ORDER BY t.created_at DESC";
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