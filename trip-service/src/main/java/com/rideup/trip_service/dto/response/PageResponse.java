package com.rideup.trip_service.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

public class PageResponse<T> {

    List<T> items;

    Meta meta;

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public static class Meta {

        int page;
        int size;

        long totalElements;
        int totalPages;

        boolean hasNext;
        boolean hasPrevious;


        String sortBy;
        String sortDirection;
    }
}