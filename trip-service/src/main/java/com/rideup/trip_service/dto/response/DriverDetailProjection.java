package com.rideup.trip_service.dto.response;

public interface DriverDetailProjection {
    String getVehicleId();
    String getVehicleImage();
    String getVehicleBrand();
    String getVehicleModel();

    String getDriverId();
    String getDriverName();
    String getDriverEmail();
    String getDriverPhone();
    String getAvatarUrl();


}
