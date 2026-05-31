package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.List;

@Component("loadAllCustomersDelegate")
public class LoadAllCustomersDelegate implements JavaDelegate {

    private final RestClient userServiceClient;

    public LoadAllCustomersDelegate(@Value("${usersservice.base-url}") String usersServiceBaseUrl) {
        this.userServiceClient = RestClient.create(usersServiceBaseUrl);
    }

    @Override
    public void execute(DelegateExecution execution) {
        // Holt die Liste aller Kunden-IDs
        List<String> customerIds = userServiceClient.get()
                .uri("/customers")
                .retrieve()
                .body(new ParameterizedTypeReference<List<String>>() {});

        execution.setVariable("customerIdList", customerIds);
    }
}