package com.example.demo.dto.response.admin;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PageResult<T> {
    List<T> items;
    int page;
    int size;
    long totalElements;
    int totalPages;
}
