package com.example.demo.repository;

import com.example.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.w3c.dom.stylesheets.LinkStyle;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String > {
    Optional<User> findByEmailAndVerifiedIsTrue(String email );
    boolean existsByEmail(String email);
    List<User> findAllByIdIn(List<String> ids);

    // ===== ADM-FEAT-04: Lọc người nhận thông báo phát sóng =====
    @org.springframework.data.jpa.repository.Query("SELECT u.id FROM User u")
    List<String> findAllIds();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT u.id FROM User u JOIN u.roles r WHERE r = :role")
    List<String> findIdsByRole(@org.springframework.data.repository.query.Param("role") com.example.demo.enums.Role role);

}
