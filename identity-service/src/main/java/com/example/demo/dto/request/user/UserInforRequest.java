package com.example.demo.dto.request.user;

import com.example.demo.enums.Gender;
import lombok.Data;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@FieldDefaults(level = lombok.AccessLevel.PRIVATE)
public class UserInforRequest {
    String fullName;
    String phoneNumber;
    String email;
    LocalDate dateOfBirth;
    Gender gender;
}
