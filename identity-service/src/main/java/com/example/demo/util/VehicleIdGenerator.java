package com.example.demo.util;

import com.example.demo.entity.Vehicle;
import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.id.IdentifierGenerator;

public class VehicleIdGenerator implements IdentifierGenerator {

    @Override
    public Object generate(SharedSessionContractImplementor session, Object object) {
        if (object instanceof Vehicle vehicle) {
            if (vehicle.getId() != null && !vehicle.getId().isBlank()) {
                return vehicle.getId();
            }
        }
        return IdStandardizer.generateVehicleId();
    }
}
