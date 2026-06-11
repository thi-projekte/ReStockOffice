package de.restockoffice;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.restockoffice.abo.SendAboConfirmationDelegate;
import de.restockoffice.delivery.SendDeliveryConfirmationDelegate;
import de.restockoffice.mail.MailDataEnrichmentService;
import java.io.IOException;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

@SpringBootTest(classes = {
        SendDeliveryConfirmationDelegate.class,
        SendAboConfirmationDelegate.class,
        ConfirmationDelegatesTest.TestConfig.class
})
@ActiveProfiles("test")
class ConfirmationDelegatesTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private SendDeliveryConfirmationDelegate sendDeliveryConfirmationDelegate;

    @Autowired
    private SendAboConfirmationDelegate sendAboConfirmationDelegate;

    @Autowired
    private FakeMailDataEnrichmentService mailDataEnrichmentService;

    private CapturingRestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        restTemplate = new CapturingRestTemplate();
        mailDataEnrichmentService.reset();
        // Keep the Spring Boot test isolated from real mail infrastructure.
        ReflectionTestUtils.setField(sendDeliveryConfirmationDelegate, "mailServiceBaseUrl", "http://mail.test");
        ReflectionTestUtils.setField(sendDeliveryConfirmationDelegate, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(sendAboConfirmationDelegate, "mailServiceBaseUrl", "http://mail.test");
        ReflectionTestUtils.setField(sendAboConfirmationDelegate, "restTemplate", restTemplate);
    }

    @Test
    void sendDeliveryConfirmationPostsEnrichedMailPayload() throws IOException {
        Map<String, Object> variables = new java.util.HashMap<>();
        mailDataEnrichmentService.deliveryConfirmationEnrichment = execution -> {
            execution.setVariable("recipientEmail", "customer@example.com");
            execution.setVariable("customerName", "ReStock GmbH");
            execution.setVariable("deliveryDateLabel", "10.06.2026");
            execution.setVariable("deliveryWindow", "08:00 - 12:00 Uhr");
            execution.setVariable("orderNumber", "ORD-42");
            execution.setVariable("supplierName", "ReStockOffice");
            execution.setVariable("itemName", "Kaffee");
            execution.setVariable("itemArticleNumber", "A-1");
            execution.setVariable("itemQuantity", "2");
        };

        sendDeliveryConfirmationDelegate.execute(execution(variables));

        assertThat(mailDataEnrichmentService.deliveryConfirmationCalls).isEqualTo(1);
        assertThat(restTemplate.postUrl).isEqualTo("http://mail.test/emails/delivery-confirmation");
        Map<String, Object> payload = OBJECT_MAPPER.convertValue(restTemplate.postBody, new TypeReference<>() {
        });
        assertThat(payload)
                .containsEntry("recipientEmail", "customer@example.com")
                .containsEntry("deliveryDate", "10.06.2026")
                .containsEntry("orderNumber", "ORD-42");
        assertThat(payload.get("deliveryItems")).asList().singleElement()
                .satisfies(item -> assertThat(item).asInstanceOf(org.assertj.core.api.InstanceOfAssertFactories.MAP)
                        .containsEntry("name", "Kaffee")
                        .containsEntry("articleNumber", "A-1")
                        .containsEntry("quantity", "2"));
    }

    @Test
    void sendAboConfirmationPostsOrderItemsFromEnrichment() throws IOException {
        Map<String, Object> variables = new java.util.HashMap<>();
        mailDataEnrichmentService.aboConfirmationEnrichment = execution -> {
            execution.setVariable("recipientEmail", "customer@example.com");
            execution.setVariable("customerName", "ReStock GmbH");
            execution.setVariable("orderNumber", "ABO-42");
            execution.setVariable("orderDate", "10.06.2026");
            execution.setVariable("deliveryWindow", "08:00 - 12:00 Uhr");
            execution.setVariable("deliveryLocation", "Hauptstrasse 1");
            execution.setVariable("changeDeadline", "07.06.2026, 12:00 Uhr");
            execution.setVariable("manageSubscriptionUrl", "https://app.restockoffice.de/subscription");
            execution.setVariable("orderItems", List.of(Map.of(
                    "name", "Kaffee",
                    "articleNumber", "A-1",
                    "quantity", "2",
                    "intervalDescription", "alle 4 Wochen",
                    "nextDeliveryDate", "10.06.2026"
            )));
        };

        sendAboConfirmationDelegate.execute(execution(variables));

        assertThat(mailDataEnrichmentService.aboConfirmationCalls).isEqualTo(1);
        assertThat(restTemplate.postUrl).isEqualTo("http://mail.test/emails/abo-confirmation");
        Map<String, Object> payload = OBJECT_MAPPER.convertValue(restTemplate.postBody, new TypeReference<>() {
        });
        assertThat(payload)
                .containsEntry("recipientEmail", "customer@example.com")
                .containsEntry("orderNumber", "ABO-42")
                .containsEntry("manageSubscriptionUrl", "https://app.restockoffice.de/subscription");
        assertThat(payload.get("orderItems")).asList().hasSize(1);
    }

    private DelegateExecution execution(Map<String, Object> variables) {
        return (DelegateExecution) Proxy.newProxyInstance(
                DelegateExecution.class.getClassLoader(),
                new Class<?>[]{DelegateExecution.class},
                (proxy, method, args) -> {
                    // The delegates only need process variables, so a small proxy is enough here.
                    if ("getVariable".equals(method.getName())) {
                        return variables.get(args[0]);
                    }
                    if ("setVariable".equals(method.getName())) {
                        variables.put((String) args[0], args[1]);
                        return null;
                    }
                    return defaultValue(method.getReturnType());
                }
        );
    }

    private Object defaultValue(Class<?> returnType) {
        if (!returnType.isPrimitive()) {
            return null;
        }
        if (boolean.class.equals(returnType)) {
            return false;
        }
        if (char.class.equals(returnType)) {
            return '\0';
        }
        return 0;
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        FakeMailDataEnrichmentService mailDataEnrichmentService() {
            return new FakeMailDataEnrichmentService();
        }
    }

    static class FakeMailDataEnrichmentService extends MailDataEnrichmentService {

        private int deliveryConfirmationCalls;
        private int aboConfirmationCalls;
        private Consumer<DelegateExecution> deliveryConfirmationEnrichment = execution -> {
        };
        private Consumer<DelegateExecution> aboConfirmationEnrichment = execution -> {
        };

        @Override
        public void enrichDeliveryConfirmation(DelegateExecution execution) {
            // Simulates the enrichment step and lets the test verify that the delegate calls it.
            deliveryConfirmationCalls++;
            deliveryConfirmationEnrichment.accept(execution);
        }

        @Override
        public void enrichAboConfirmation(DelegateExecution execution) {
            aboConfirmationCalls++;
            aboConfirmationEnrichment.accept(execution);
        }

        private void reset() {
            deliveryConfirmationCalls = 0;
            aboConfirmationCalls = 0;
            deliveryConfirmationEnrichment = execution -> {
            };
            aboConfirmationEnrichment = execution -> {
            };
        }
    }

    private static class CapturingRestTemplate extends RestTemplate {

        private String postUrl;
        private Object postBody;

        @Override
        public <T> ResponseEntity<T> postForEntity(String url, Object request, Class<T> responseType, Object... uriVariables) {
            // Capture the outgoing request instead of opening a real HTTP connection.
            postUrl = url;
            postBody = request;
            return ResponseEntity.ok().build();
        }
    }
}
