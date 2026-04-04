package com.rideUp.booking_service.config;

import com.rideUp.booking_service.dto.request.IdempotencyRecord;
import com.rideUp.booking_service.enums.IdempotencyRecordStatus;
import com.rideUp.booking_service.service.IdempotencyService;
import com.rideUp.booking_service.utils.RequestHashUtil;
import com.rideUp.booking_service.utils.SecurityUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequestWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.ByteArrayInputStream;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

@RequiredArgsConstructor
public class IdempotencyFilter extends OncePerRequestFilter {

    private final IdempotencyService service;
    private final RequestHashUtil hashUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String createBookingPath = request.getContextPath() + "/bookings";
        if (!"POST".equalsIgnoreCase(request.getMethod()) || !createBookingPath.equals(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        String idempotencyKey = request.getHeader("Idempotency-Key");
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            writePlainResponse(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Missing required header: Idempotency-Key");
            return;
        }

        byte[] requestBytes = StreamUtils.copyToByteArray(request.getInputStream());
        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request, requestBytes);

        ContentCachingResponseWrapper wrappedResponse =
                new ContentCachingResponseWrapper(response);

        String requestBody = new String(requestBytes, resolveCharset(request.getCharacterEncoding()));
        String requestHash = hashUtil.hash(requestBody);
        String userId = SecurityUtils.getCurrentUserId();
        String redisKey = "idempotency:booking:" + userId + ":" + idempotencyKey;

        IdempotencyRecord existingRecord = service.get(redisKey);
        if (existingRecord != null) {
            handleExistingRecord(response, existingRecord, requestHash);
            return;
        }

        boolean created = service.tryCreateProcessing(redisKey, requestHash);
        if (!created) {
            IdempotencyRecord currentRecord = service.get(redisKey);
            if (currentRecord == null) {
                writePlainResponse(response, HttpServletResponse.SC_CONFLICT, "Request is processing");
                return;
            }

            handleExistingRecord(response, currentRecord, requestHash);
            return;
        }

        try {
            filterChain.doFilter(wrappedRequest, wrappedResponse);
        } catch (Exception ex) {
            service.delete(redisKey);
            throw ex;
        }

        int status = wrappedResponse.getStatus();
        if (status >= 200 && status < 300) {
            String responseBody = new String(
                    wrappedResponse.getContentAsByteArray(),
                    resolveCharset(response.getCharacterEncoding())
            );

            IdempotencyRecord record = IdempotencyRecord.builder()
                    .status(IdempotencyRecordStatus.SUCCESS.name())
                    .requestHash(requestHash)
                    .response(responseBody)
                    .httpStatus(status)
                    .contentType(wrappedResponse.getContentType())
                    .createdAt(System.currentTimeMillis())
                    .build();

            service.saveSuccess(redisKey, record);
        } else {
            service.delete(redisKey);
        }

        wrappedResponse.copyBodyToResponse();
    }

    private void handleExistingRecord(HttpServletResponse response,
                                      IdempotencyRecord record,
                                      String requestHash) throws IOException {
        if (!requestHash.equals(record.getRequestHash())) {
            writePlainResponse(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Idempotency key reused with different request");
            return;
        }

        if (IdempotencyRecordStatus.SUCCESS.name().equals(record.getStatus())) {
            int status = record.getHttpStatus() == null ? HttpServletResponse.SC_OK : record.getHttpStatus();
            response.setStatus(status);
            response.setContentType(record.getContentType() == null ? "application/json" : record.getContentType());
            response.getWriter().write(record.getResponse() == null ? "" : record.getResponse());
            return;
        }

        writePlainResponse(response, HttpServletResponse.SC_CONFLICT, "Request is processing");
    }

    private void writePlainResponse(HttpServletResponse response, int status, String body) throws IOException {
        response.setStatus(status);
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write(body);
    }

    private Charset resolveCharset(String encoding) {
        if (encoding == null || encoding.isBlank()) {
            return StandardCharsets.UTF_8;
        }

        try {
            return Charset.forName(encoding);
        } catch (Exception ignored) {
            return StandardCharsets.UTF_8;
        }
    }

    private static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {

        private final byte[] cachedBody;

        CachedBodyHttpServletRequest(HttpServletRequest request, byte[] cachedBody) {
            super(request);
            this.cachedBody = cachedBody;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(cachedBody);

            return new ServletInputStream() {
                @Override
                public int read() {
                    return inputStream.read();
                }

                @Override
                public boolean isFinished() {
                    return inputStream.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    throw new UnsupportedOperationException();
                }
            };
        }
    }
}