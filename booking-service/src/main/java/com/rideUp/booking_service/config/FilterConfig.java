package com.rideUp.booking_service.config;

import com.rideUp.booking_service.service.IdempotencyService;
import com.rideUp.booking_service.utils.RequestHashUtil;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class FilterConfig {
    @Bean
    public FilterRegistrationBean<IdempotencyFilter> idempotencyFilter(
            IdempotencyService service,
            RequestHashUtil hashUtil) {

        FilterRegistrationBean<IdempotencyFilter> reg = new FilterRegistrationBean<>();

        reg.setFilter(new IdempotencyFilter(service, hashUtil));
        reg.addUrlPatterns("/bookings");
        reg.addUrlPatterns("/bookings/*");
        reg.setOrder(1);

        return reg;
    }
}
