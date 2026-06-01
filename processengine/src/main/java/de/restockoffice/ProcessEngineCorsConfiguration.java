package de.restockoffice;

import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ProcessEngineCorsConfiguration {

  @Bean
  public FilterRegistrationBean<Filter> processEngineCorsFilter(
      @Value("${restockoffice.cors.allowed-origins}") List<String> allowedOrigins) {
    Set<String> allowedOriginSet = Set.copyOf(allowedOrigins);

    Filter corsFilter = (request, response, chain) -> {
      HttpServletRequest httpRequest = (HttpServletRequest) request;
      HttpServletResponse httpResponse = (HttpServletResponse) response;
      String origin = httpRequest.getHeader("Origin");

      if (origin != null && allowedOriginSet.contains(origin)) {
        httpResponse.setHeader("Access-Control-Allow-Origin", origin);
        httpResponse.setHeader("Vary", "Origin");
        httpResponse.setHeader("Access-Control-Allow-Credentials", "true");
        httpResponse.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,HEAD");
        httpResponse.setHeader(
            "Access-Control-Allow-Headers",
            "Authorization,Content-Type,Accept,Origin,X-Requested-With");
        httpResponse.setHeader("Access-Control-Max-Age", "3600");
      }

      if ("OPTIONS".equalsIgnoreCase(httpRequest.getMethod())) {
        httpResponse.setStatus(HttpServletResponse.SC_OK);
        return;
      }

      chain.doFilter(request, response);
    };

    FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>(corsFilter);
    registration.addUrlPatterns("/*");
    registration.setOrder(0);
    return registration;
  }
}
