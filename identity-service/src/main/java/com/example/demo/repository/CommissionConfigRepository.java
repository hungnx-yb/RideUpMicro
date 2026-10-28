package com.example.demo.repository;

import com.example.demo.entity.CommissionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CommissionConfigRepository extends JpaRepository<CommissionConfig, String> {
}
