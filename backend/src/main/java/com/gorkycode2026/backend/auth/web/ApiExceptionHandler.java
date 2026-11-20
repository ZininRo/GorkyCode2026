package com.gorkycode2026.backend.auth.web;

import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
public class ApiExceptionHandler {
    private final RefreshCookieService cookies;

    public ApiExceptionHandler(RefreshCookieService cookies) {
        this.cookies = cookies;
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApi(ApiException exception) {
        ResponseEntity.BodyBuilder builder = ResponseEntity.status(exception.status());
        if ("INVALID_REFRESH_TOKEN".equals(exception.code())) {
            builder.header(HttpHeaders.SET_COOKIE, cookies.clearCookie());
        }
        return builder.body(ApiError.of(exception.code(), exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
        List<ApiError.FieldIssue> fields = exception.getBindingResult().getFieldErrors().stream()
                .map(field -> new ApiError.FieldIssue(field.getField(), field.getDefaultMessage()))
                .distinct()
                .sorted(Comparator.comparing(ApiError.FieldIssue::field))
                .toList();
        return ResponseEntity.badRequest().body(new ApiError(
                new ApiError.Details("VALIDATION_ERROR", "Некорректные данные запроса", fields)));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleMalformedJson(HttpMessageNotReadableException exception) {
        return ResponseEntity.badRequest().body(ApiError.of("VALIDATION_ERROR", "Некорректный JSON-запрос"));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiError> handleInvalidParameter(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest().body(ApiError.of("VALIDATION_ERROR",
                "Некорректный параметр запроса: " + exception.getName()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handleNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiError.of("NOT_FOUND", "Ресурс не найден"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception exception) {
        // Never include exception text or credentials in public error responses.
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiError.of("INTERNAL_ERROR", "Внутренняя ошибка сервера"));
    }
}
