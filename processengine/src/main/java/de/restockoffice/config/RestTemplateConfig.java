package de.restockoffice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate(OAuth2AuthorizedClientManager authorizedClientManager) {
        RestTemplate restTemplate = new RestTemplate();
        restTemplate.getInterceptors().add((request, body, execution) -> {
            if (!request.getHeaders().containsKey("Authorization")) {
                OAuth2AuthorizeRequest authRequest = OAuth2AuthorizeRequest
                        .withClientRegistrationId("keycloak")
                        .principal("CamundaTimerService")
                        .build();

                var authorizedClient = authorizedClientManager.authorize(authRequest);
                if (authorizedClient != null && authorizedClient.getAccessToken() != null) {
                    request.getHeaders().setBearerAuth(authorizedClient.getAccessToken().getTokenValue());
                }
            }
            return execution.execute(request, body);
        });
        return restTemplate;
    }
}
