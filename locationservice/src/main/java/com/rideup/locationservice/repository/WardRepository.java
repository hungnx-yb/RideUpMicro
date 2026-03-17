package com.rideup.locationservice.repository;

import com.rideup.locationservice.entity.Province;
import com.rideup.locationservice.entity.Ward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WardRepository extends JpaRepository<Ward, String> {
    List<Ward> findByProvinceId(String provinceId);
    boolean existsByOsmId(Long osmId);

    @Query(value = """
    SELECT * 
    FROM ward w
    WHERE w.province_id = :provinceId
      AND (:keyword IS NULL 
           OR LOWER(w.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """, nativeQuery = true)
    List<Ward> getAllWards(@Param("keyword") String keyword,
                           @Param("provinceId") String provinceId);
}


