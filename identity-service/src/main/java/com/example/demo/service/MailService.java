package com.example.demo.service;

import jakarta.mail.internet.MimeMessage;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.experimental.NonFinal;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MailService {
    JavaMailSender mailSender;

    @NonFinal
    @Value("${app.frontend-base-url:}")
    String frontendBaseUrl;

    public void sendVerificationEmail(String to, String token, String username) throws Exception {
        String subject = "Xác minh tài khoản của "+ username+" trên RideUp";
        String verificationUrl = buildVerificationUrl(token);
        String content = "<b>Chúc mừng bạn đã đăng kí tài khoản thành công trên ứng dụng RideUp!</b><br><br>"
                + "Nhấn vào <a href=\"" + verificationUrl + "\">đây</a> để xác minh tài khoản.";

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(content, true); //
        mailSender.send(message);
    }

    private String resolveBaseUrl() {
        if (frontendBaseUrl != null && !frontendBaseUrl.isBlank() && !frontendBaseUrl.contains("localhost")) {
            return frontendBaseUrl.endsWith("/")
                    ? frontendBaseUrl.substring(0, frontendBaseUrl.length() - 1)
                    : frontendBaseUrl;
        }

        String lanIp = getLanIpAddress();
        return "http://" + lanIp + ":5173";
    }

    private String getLanIpAddress() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp()) {
                    continue;
                }
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (!addr.isLoopbackAddress() && addr.isSiteLocalAddress() && addr.getHostAddress().contains(".")) {
                        return addr.getHostAddress();
                    }
                }
            }
            return InetAddress.getLocalHost().getHostAddress();
        } catch (Exception e) {
            log.warn("Could not determine local LAN IP, fallback to localhost: {}", e.getMessage());
            return "localhost";
        }
    }

    private String buildVerificationUrl(String token) {
        String baseUrl = resolveBaseUrl();
        String encodedToken = URLEncoder.encode(token, StandardCharsets.UTF_8);
        return baseUrl + "/auth/verify?token=" + encodedToken;
    }

    public void sendOtpChangePasswordEmail(String email, String otp, String username) {
        String subject = "Mã OTP thay đổi mật khẩu cho tài khoản " + username;
        String content = "<b>Đây là mã OTP để thay đổi mật khẩu cho tài khoản " + username + " trên ứng dụng RideUp:</b><br><br>"
                + "<h2>" + otp + "</h2><br>"
                + "Mã OTP có hiệu lực trong 5 phút.";
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(content, true); //
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send OTP change password email to {}: {}", email, e.getMessage());
        }
    }
}

