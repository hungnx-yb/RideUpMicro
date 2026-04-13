package com.rideup.chat_service.controller;


import com.rideup.chat_service.constant.StoragePrefixConstant;
import com.rideup.chat_service.dto.response.ApiResponse;
import com.rideup.chat_service.service.FileService;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/file")
@RequiredArgsConstructor
@FieldDefaults(level = lombok.AccessLevel.PRIVATE, makeFinal = true)
public class FileController {
    FileService fileService;
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<String> uploadFiles(@RequestParam("file") MultipartFile file) {
        String objectPath = fileService.upload(file, StoragePrefixConstant.ATTACHMENTS);
        return ApiResponse.<String>builder()
            .result(objectPath)
                .message("File uploaded successfully")
                .build();
    }

}
