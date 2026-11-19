package com.gorkycode2026.backend.api.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gorkycode2026.backend.auth.web.OriginVerificationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OriginVerificationFilterTest {
    private final OriginVerificationFilter filter =
            new OriginVerificationFilter("http://localhost:5173,http://localhost:8080", new ObjectMapper());

    @Test
    void crossSitePostIsRejected() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/refresh");
        req.setServletPath("/api/v1/auth/refresh");
        req.addHeader("Origin", "https://untrusted.example");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertEquals(403, res.getStatus());
        assertTrue(res.getContentAsString().contains("FORBIDDEN_ORIGIN"));
    }

    @Test
    void expectedReactOriginPasses() throws Exception {
        MockHttpServletRequest req = new MockHttpServletRequest("POST", "/api/v1/auth/refresh");
        req.setServletPath("/api/v1/auth/refresh");
        req.addHeader("Origin", "http://localhost:5173");
        MockHttpServletResponse res = new MockHttpServletResponse();
        filter.doFilter(req, res, new MockFilterChain());
        assertEquals(200, res.getStatus());
    }
}
