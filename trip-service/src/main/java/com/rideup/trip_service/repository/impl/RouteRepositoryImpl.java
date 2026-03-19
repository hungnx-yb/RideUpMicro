package com.rideup.trip_service.repository.impl;

import com.rideup.trip_service.dto.response.RouteResponse;
import com.rideup.trip_service.entity.Route;
import com.rideup.trip_service.repository.RouteRepository;
import com.rideup.trip_service.repository.RouteRepositoryCustom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import javax.sql.CommonDataSource;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RouteRepositoryImpl implements RouteRepositoryCustom {

    EntityManager entityManager;

    @Override
    public Page<Route> getAllRoutes(String startProvinceId, String endProvinceId, Boolean isActive, Pageable pageable) {
        StringBuilder baseQuery = new StringBuilder(" FROM route r WHERE 1=1 ");
        Map<String, Object> params = new HashMap<>();

        if (startProvinceId != null && !startProvinceId.isBlank()) {
            baseQuery.append(" AND r.start_province_id = :startProvinceId ");
            params.put("startProvinceId", startProvinceId);
        }

        if (endProvinceId != null && !endProvinceId.isBlank()) {
            baseQuery.append(" AND r.end_province_id = :endProvinceId ");
            params.put("endProvinceId", endProvinceId);
        }

        if (isActive != null) {
            baseQuery.append(" AND r.is_active = :isActive ");
            params.put("isActive", isActive);
        }


        String countSql = "SELECT COUNT(*) " + baseQuery;
        Query countQuery = entityManager.createNativeQuery(countSql);
        params.forEach(countQuery::setParameter);

        Number total = (Number) countQuery.getSingleResult();

        String dataSql = "SELECT * " + baseQuery + " ORDER BY r.created_at DESC";
        Query dataQuery = entityManager.createNativeQuery(dataSql, Route.class);
        params.forEach(dataQuery::setParameter);

        if (pageable != null) {
            dataQuery.setFirstResult((int) pageable.getOffset());
            dataQuery.setMaxResults(pageable.getPageSize());
        }

        List<Route> result = dataQuery.getResultList();

        return new PageImpl<>(
                result,
                pageable != null ? pageable : Pageable.unpaged(),
                total.longValue()
        );
    }
}

