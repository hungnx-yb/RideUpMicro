package com.example.demo.util;

import com.example.demo.entity.DriverProfile;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.IdentifierGenerator;

public class DriverProfileIdGenerator implements IdentifierGenerator {

    @Override
    public Object generate(SharedSessionContractImplementor session, Object object) {
        if (object instanceof DriverProfile profile) {
            if (profile.getId() != null && !profile.getId().isBlank()) {
                return profile.getId();
            }
        }
        return IdStandardizer.generateDriverProfileId();
    }
}
