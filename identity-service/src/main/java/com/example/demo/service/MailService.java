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

import java.net.DatagramSocket;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Enumeration;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class MailService {
    private static final List<String> VIRTUAL_ADAPTER_KEYWORDS = List.of(
            "vethernet", "wsl", "hyper-v", "vmware", "virtualbox", "vbox", "docker",
            "radmin", "vpn", "tap", "tun", "hamachi", "zerotier", "tailscale", "loopback");

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
        String routeIp = getDefaultRouteIp();
        if (routeIp != null) {
            return routeIp;
        }
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface iface = interfaces.nextElement();
                if (iface.isLoopback() || !iface.isUp() || iface.isVirtual() || isVirtualAdapter(iface)) {
                    continue;
                }
                Enumeration<InetAddress> addresses = iface.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof Inet4Address && !addr.isLoopbackAddress() && addr.isSiteLocalAddress()) {
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

    /**
     * Lấy IP của card mạng mà hệ điều hành dùng để ra Internet (Wi-Fi/Ethernet thật).
     * UDP connect chỉ chọn route, không gửi gói tin nào.
     */
    private String getDefaultRouteIp() {
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.connect(InetAddress.getByName("8.8.8.8"), 53);
            InetAddress local = socket.getLocalAddress();
            if (local instanceof Inet4Address && !local.isAnyLocalAddress() && !local.isLoopbackAddress()) {
                return local.getHostAddress();
            }
        } catch (Exception e) {
            log.debug("Could not resolve default route IP: {}", e.getMessage());
        }
        return null;
    }

    private boolean isVirtualAdapter(NetworkInterface iface) {
        String name = (iface.getName() + " " + iface.getDisplayName()).toLowerCase();
        return VIRTUAL_ADAPTER_KEYWORDS.stream().anyMatch(name::contains);
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

