package de.restockoffice;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import java.util.List;

@Component("loadAllCustomersDelegate")
public class LoadAllCustomersDelegate implements JavaDelegate {

    private final RestClient userServiceClient = RestClient.create("https://users.restockoffice.de");

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