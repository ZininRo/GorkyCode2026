package com.gorkycode2026.backend.auth.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;

public final class ApiErrorWriter {
    private ApiErrorWriter() { }

    public static void write(HttpServletResponse response, ObjectMapper mapper,
                             int httpStatus, String code, String message) throws IOException {
        response.setStatus(httpStatus);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getWriter(), ApiError.of(code, message));
    }
}
