package com.rideUp.payment_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideUp.payment_service.dto.request.UpdateDriverStripeStatusRequest;
import com.rideUp.payment_service.dto.response.*;
import com.rideUp.payment_service.enums.StripeAccountStatus;
import com.rideUp.payment_service.exception.AppException;
import com.rideUp.payment_service.exception.ErrorCode;
import com.rideUp.payment_service.feignClient.IdentityServiceClient;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Account;
import com.stripe.model.AccountLink;
import com.stripe.model.LoginLink;
import com.stripe.net.Webhook;
import com.stripe.param.AccountCreateParams;
import com.stripe.param.AccountLinkCreateParams;
import com.stripe.param.LoginLinkCreateOnAccountParams;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class StripeConnectService {

    final IdentityServiceClient identityServiceClient;
    final ObjectMapper objectMapper;

    @Value("${stripe.return-url:http://localhost:3000/driver/stripe/return}")
    String returnUrl;

    @Value("${stripe.refresh-url:http://localhost:3000/driver/stripe/refresh}")
    String refreshUrl;

    @Value("${stripe.webhook-secret:whsec_test}")
    String webhookSecret;

    public DriverOnboardLinkResponse createOnboardLink(String driverId) {
        log.info("[StripeConnect] Creating onboard link for driverId={}", driverId);
        DriverFinancialProfileResponse profile = getDriverFinancialProfileSafely(driverId);

        String stripeAccountId = profile.getStripeAccountId();

        try {
            if (stripeAccountId == null || stripeAccountId.isBlank()) {
                stripeAccountId = createConnectedAccount(driverId);
                log.info("[StripeConnect] Created Stripe Express account {} for driverId={}", stripeAccountId, driverId);

                identityServiceClient.updateDriverStripeStatus(driverId, UpdateDriverStripeStatusRequest.builder()
                        .stripeAccountId(stripeAccountId)
                        .stripeAccountStatus(StripeAccountStatus.PENDING_VERIFICATION)
                        .stripePayoutsEnabled(false)
                        .build());
            }

            AccountLinkCreateParams linkParams = AccountLinkCreateParams.builder()
                    .setAccount(stripeAccountId)
                    .setRefreshUrl(refreshUrl)
                    .setReturnUrl(returnUrl)
                    .setType(AccountLinkCreateParams.Type.ACCOUNT_ONBOARDING)
                    .build();

            AccountLink accountLink = AccountLink.create(linkParams);
            log.info("[StripeConnect] Generated onboarding URL for driverId={}, stripeAccountId={}", driverId, stripeAccountId);

            return DriverOnboardLinkResponse.builder()
                    .onboardUrl(accountLink.getUrl())
                    .stripeAccountId(stripeAccountId)
                    .expiresAt(accountLink.getExpiresAt())
                    .build();

        } catch (StripeException e) {
            log.error("[StripeConnect] Stripe API error creating onboarding link for driver {}: {}", driverId, e.getMessage(), e);
            throw new AppException(ErrorCode.STRIPE_CONNECT_ERROR);
        }
    }

    public DriverAccountStatusResponse getAccountStatus(String driverId) {
        log.info("[StripeConnect] Checking account status for driverId={}", driverId);
        DriverFinancialProfileResponse profile = getDriverFinancialProfileSafely(driverId);

        String stripeAccountId = profile.getStripeAccountId();
        if (stripeAccountId == null || stripeAccountId.isBlank()) {
            return DriverAccountStatusResponse.builder()
                    .driverId(driverId)
                    .stripeAccountId(null)
                    .status(StripeAccountStatus.NOT_CONNECTED)
                    .payoutsEnabled(false)
                    .detailsSubmitted(false)
                    .currentDebt(profile.getSystemDebt() != null ? profile.getSystemDebt() : BigDecimal.ZERO)
                    .build();
        }

        try {
            Account account = Account.retrieve(stripeAccountId);
            boolean payoutsEnabled = Boolean.TRUE.equals(account.getPayoutsEnabled());
            boolean detailsSubmitted = Boolean.TRUE.equals(account.getDetailsSubmitted());

            StripeAccountStatus computedStatus;
            if (payoutsEnabled && detailsSubmitted) {
                computedStatus = StripeAccountStatus.ACTIVE;
            } else if (detailsSubmitted) {
                computedStatus = StripeAccountStatus.PENDING_VERIFICATION;
            } else {
                computedStatus = StripeAccountStatus.PENDING_VERIFICATION;
            }

            if (profile.getStripeAccountStatus() != computedStatus
                    || !Boolean.valueOf(payoutsEnabled).equals(profile.getStripePayoutsEnabled())) {
                identityServiceClient.updateDriverStripeStatus(driverId, UpdateDriverStripeStatusRequest.builder()
                        .stripeAccountId(stripeAccountId)
                        .stripeAccountStatus(computedStatus)
                        .stripePayoutsEnabled(payoutsEnabled)
                        .build());
                log.info("[StripeConnect] Synced driver {} status: {} (payoutsEnabled={})", driverId, computedStatus, payoutsEnabled);
            }

            return DriverAccountStatusResponse.builder()
                    .driverId(driverId)
                    .stripeAccountId(stripeAccountId)
                    .status(computedStatus)
                    .payoutsEnabled(payoutsEnabled)
                    .detailsSubmitted(detailsSubmitted)
                    .currentDebt(profile.getSystemDebt() != null ? profile.getSystemDebt() : BigDecimal.ZERO)
                    .build();

        } catch (StripeException e) {
            log.error("[StripeConnect] Error retrieving Stripe account {} for driver {}: {}", stripeAccountId, driverId, e.getMessage(), e);
            return DriverAccountStatusResponse.builder()
                    .driverId(driverId)
                    .stripeAccountId(stripeAccountId)
                    .status(profile.getStripeAccountStatus() != null ? profile.getStripeAccountStatus() : StripeAccountStatus.NOT_CONNECTED)
                    .payoutsEnabled(Boolean.TRUE.equals(profile.getStripePayoutsEnabled()))
                    .detailsSubmitted(false)
                    .currentDebt(profile.getSystemDebt() != null ? profile.getSystemDebt() : BigDecimal.ZERO)
                    .build();
        }
    }

    public DriverDashboardLinkResponse createDashboardLink(String driverId) {
        log.info("[StripeConnect] Creating dashboard link for driverId={}", driverId);
        DriverFinancialProfileResponse profile = getDriverFinancialProfileSafely(driverId);

        String stripeAccountId = profile.getStripeAccountId();
        if (stripeAccountId == null || stripeAccountId.isBlank()
                || profile.getStripeAccountStatus() != StripeAccountStatus.ACTIVE) {
            throw new AppException(ErrorCode.DRIVER_STRIPE_NOT_ONBOARDED);
        }

        try {
            LoginLink loginLink = LoginLink.createOnAccount(
                    stripeAccountId,
                    LoginLinkCreateOnAccountParams.builder().build(),
                    null
            );
            return DriverDashboardLinkResponse.builder()
                    .dashboardUrl(loginLink.getUrl())
                    .build();
        } catch (StripeException e) {
            log.error("[StripeConnect] Error creating LoginLink for driver {}: {}", driverId, e.getMessage(), e);
            throw new AppException(ErrorCode.STRIPE_CONNECT_ERROR);
        }
    }

    public void handleStripeWebhook(String payload, String sigHeader) {
        if (sigHeader != null && webhookSecret != null && !webhookSecret.isBlank() && !"whsec_test".equals(webhookSecret)) {
            try {
                Webhook.constructEvent(payload, sigHeader, webhookSecret);
            } catch (SignatureVerificationException e) {
                log.warn("[StripeConnect][Webhook] Signature verification failed: {}", e.getMessage());
                throw new AppException(ErrorCode.STRIPE_WEBHOOK_INVALID);
            } catch (Exception e) {
                log.error("[StripeConnect][Webhook] Failed to verify webhook: {}", e.getMessage());
                throw new AppException(ErrorCode.STRIPE_WEBHOOK_INVALID);
            }
        }

        try {
            JsonNode rootNode = objectMapper.readTree(payload);
            String eventType = rootNode.path("type").asText();
            String eventId = rootNode.path("id").asText();
            log.info("[StripeConnect][Webhook] Received event: type={}, id={}", eventType, eventId);

            if ("account.updated".equals(eventType)) {
                JsonNode accountNode = rootNode.path("data").path("object");
                String stripeAccountId = accountNode.path("id").asText();
                boolean payoutsEnabled = accountNode.path("payouts_enabled").asBoolean(false);
                boolean detailsSubmitted = accountNode.path("details_submitted").asBoolean(false);
                String driverId = accountNode.path("metadata").path("driverId").asText(null);

                log.info("[StripeConnect][Webhook] account.updated: acct={}, driverId={}, payoutsEnabled={}, detailsSubmitted={}",
                        stripeAccountId, driverId, payoutsEnabled, detailsSubmitted);

                StripeAccountStatus status = (payoutsEnabled && detailsSubmitted)
                        ? StripeAccountStatus.ACTIVE
                        : StripeAccountStatus.PENDING_VERIFICATION;

                UpdateDriverStripeStatusRequest updateRequest = UpdateDriverStripeStatusRequest.builder()
                        .stripeAccountId(stripeAccountId)
                        .stripeAccountStatus(status)
                        .stripePayoutsEnabled(payoutsEnabled)
                        .build();

                if (driverId != null && !driverId.isBlank()) {
                    identityServiceClient.updateDriverStripeStatus(driverId, updateRequest);
                    log.info("[StripeConnect][Webhook] Updated driver {} Stripe status to {} via webhook", driverId, status);
                } else {
                    try {
                        identityServiceClient.updateDriverStripeStatusByAccountId(stripeAccountId, updateRequest);
                        log.info("[StripeConnect][Webhook] Updated driver Stripe status by accountId {} to {} via webhook", stripeAccountId, status);
                    } catch (Exception ex) {
                        log.warn("[StripeConnect][Webhook] Could not update driver by accountId {}: {}", stripeAccountId, ex.getMessage());
                    }
                }
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("[StripeConnect][Webhook] Failed to parse Stripe webhook payload: {}", e.getMessage(), e);
            throw new AppException(ErrorCode.STRIPE_WEBHOOK_INVALID);
        }
    }

    private String createConnectedAccount(String driverId) throws StripeException {
        try {
            String url = "https://api.stripe.com/v2/core/accounts";
            String contactEmail = "driver_" + driverId + "@rideup.vn";
            Map<String, Object> body = Map.of(
                    "contact_email", contactEmail,
                    "identity", Map.of("country", "US"),
                    "dashboard", "express",
                    "defaults", Map.of(
                            "responsibilities", Map.of(
                                    "fees_collector", "application",
                                    "losses_collector", "application"
                            )
                    ),
                    "configuration", Map.of(
                            "recipient", Map.of(
                                    "capabilities", Map.of(
                                            "stripe_balance", Map.of(
                                                    "stripe_transfers", Map.of("requested", true)
                                            )
                                    )
                            )
                    ),
                    "metadata", Map.of("driverId", driverId)
            );

            String jsonPayload = objectMapper.writeValueAsString(body);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + com.stripe.Stripe.apiKey)
                    .header("Stripe-Version", "2026-10-28.endive")
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpClient client = HttpClient.newHttpClient();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                JsonNode root = objectMapper.readTree(response.body());
                String acctId = root.path("id").asText();
                if (acctId != null && !acctId.isBlank()) {
                    log.info("[StripeConnect] Successfully created Connected Account {} via Accounts v2 for driver {}", acctId, driverId);
                    return acctId;
                }
            } else {
                log.warn("[StripeConnect] Accounts v2 API responded with code {}: {}. Attempting fallback to v1...",
                        response.statusCode(), response.body());
            }
        } catch (Exception e) {
            log.warn("[StripeConnect] Exception during Accounts v2 creation: {}. Attempting fallback to v1...", e.getMessage());
        }

        // Fallback to v1
        AccountCreateParams params = AccountCreateParams.builder()
                .setType(AccountCreateParams.Type.EXPRESS)
                .setCountry("US")
                .setCapabilities(AccountCreateParams.Capabilities.builder()
                        .setTransfers(AccountCreateParams.Capabilities.Transfers.builder()
                                .setRequested(true)
                                .build())
                        .build())
                .putMetadata("driverId", driverId)
                .build();
        Account account = Account.create(params);
        return account.getId();
    }

    private DriverFinancialProfileResponse getDriverFinancialProfileSafely(String driverId) {
        ApiResponse<DriverFinancialProfileResponse> response = identityServiceClient.getDriverFinancialProfile(driverId);
        if (response == null || response.getResult() == null) {
            log.error("[StripeConnect] Failed to fetch driver financial profile for driverId={}", driverId);
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
        return response.getResult();
    }
}
