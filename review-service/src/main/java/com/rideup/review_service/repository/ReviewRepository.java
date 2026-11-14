package com.rideup.review_service.repository;

import com.rideup.review_service.dto.DriverRatingStats;
import com.rideup.review_service.entity.Review;
import org.springframework.data.mongodb.repository.Aggregation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByDriverId(String driverId);
    List<Review> findByTripId(String tripId);
    Optional<Review> findByBookingId(String bookingId);
    boolean existsByBookingId(String bookingId);

    @Aggregation(pipeline = {
        "{ '$match': { 'driverId': ?0 } }",
        "{ '$group': { '_id': '$driverId', 'averageRating': { '$avg': '$rating' }, 'totalReviews': { '$sum': 1 } } }"
    })
    DriverRatingStats getRatingStatsByDriverId(String driverId);
}
