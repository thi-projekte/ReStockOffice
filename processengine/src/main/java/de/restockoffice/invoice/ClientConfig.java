package de.restockoffice.invoice;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.client.OAuth2AuthorizeRequest;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientManager;
import org.springframework.web.client.RestClient;

@Configuration
public class ClientConfig {

    @Bean
    public RestClient.Builder oauth2RestClientBuilder(
            OAuth2AuthorizedClientManager authorizedClientManager) {

        return RestClient.builder()
                .requestInterceptor((request, body, env) -> {
                    OAuth2AuthorizeRequest authRequest = OAuth2AuthorizeRequest
                            .withClientRegistrationId("keycloak")
                            .principal("restockoffice-backend")
                            .build();

                    var authorizedClient = authorizedClientManager.authorize(authRequest);
                    if (authorizedClient != null && authorizedClient.getAccessToken() != null) {
                        request.getHeaders().setBearerAuth(authorizedClient.getAccessToken().getTokenValue());
                    }
                    return env.execute(request, body);
                });
    }
}