package com.rideup.locationservice.repository;

import com.rideup.locationservice.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProvinceRepository extends JpaRepository<Province, String> {
    Optional<Province> findByName(String name);
    Optional<Province> findByOsmId(Long osmId);
    boolean existsByOsmId(Long osmId);


    @Query(value = """
    SELECT * 
    FROM province p
    WHERE (:keyword IS NULL 
        OR LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')))
    """, nativeQuery = true)
    List<Province> getAllProvinces(@Param("keyword") String keyword);}

