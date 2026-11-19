package com.gorkycode2026.backend.auth.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

public record ApiError(Details error) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Details(String code, String message, List<FieldIssue> details) { }
    public record FieldIssue(String field, String message) { }

    public static ApiError of(String code, String message) {
        return new ApiError(new Details(code, message, null));
    }
}
