package de.restockoffice;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.restockoffice.delivery.DeliveryMonitoringItem;
import de.restockoffice.delivery.FetchDeliveriesForAnnouncementDelegate;
import de.restockoffice.delivery.SendDeliveryAnnouncementDelegate;
import de.restockoffice.mail.MailDataEnrichmentService;
import java.io.IOException;
import java.io.Serializable;
import java.lang.reflect.Proxy;
import java.time.LocalDate;
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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

@SpringBootTest(classes = {
        FetchDeliveriesForAnnouncementDelegate.class,
        SendDeliveryAnnouncementDelegate.class,
        DeliveryAnnouncementDelegatesTest.TestConfig.class
})
@ActiveProfiles("test")
class DeliveryAnnouncementDelegatesTest {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Autowired
    private FetchDeliveriesForAnnouncementDelegate fetchDeliveriesForAnnouncementDelegate;

    @Autowired
    private SendDeliveryAnnouncementDelegate sendDeliveryAnnouncementDelegate;

    @Autowired
    private FakeMailDataEnrichmentService mailDataEnrichmentService;

    private CapturingRestTemplate restTemplate;

    @BeforeEach
    void setUp() {
        restTemplate = new CapturingRestTemplate();
        mailDataEnrichmentService.reset();
        // Replace external HTTP calls with an in-memory RestTemplate for deterministic tests.
        ReflectionTestUtils.setField(fetchDeliveriesForAnnouncementDelegate, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(sendDeliveryAnnouncementDelegate, "restTemplate", restTemplate);
    }

    @Test
    void fetchDeliveriesFiltersMonitorableDeliveriesForAnnouncementDate() {
        LocalDate today = LocalDate.now();
        restTemplate.getResponse = new FetchDeliveriesForAnnouncementDelegate.DeliveryDetailResponse[]{
                new FetchDeliveriesForAnnouncementDelegate.DeliveryDetailResponse("delivery-1", "order-1", "customer-1", today.toString(), "OPEN"),
                new FetchDeliveriesForAnnouncementDelegate.DeliveryDetailResponse("delivery-2", "order-2", "customer-2", today.toString(), "ACCEPTED"),
                new FetchDeliveriesForAnnouncementDelegate.DeliveryDetailResponse("delivery-3", "order-3", "customer-3", today.toString(), "COLLECTED"),
                new FetchDeliveriesForAnnouncementDelegate.DeliveryDetailResponse("delivery-4", "order-4", "customer-4", today.toString(), "DELIVERED"),
                new FetchDeliveriesForAnnouncementDelegate.DeliveryDetailResponse("delivery-5", "order-5", "customer-5", today.plusDays(1).toString(), "OPEN")
        };
        // Deliveries already assigned to a restocker still need monitoring for the confirmation mail.
        ReflectionTestUtils.setField(fetchDeliveriesForAnnouncementDelegate, "deliveriesServiceBaseUrl", "http://deliveries.test");
        ReflectionTestUtils.setField(fetchDeliveriesForAnnouncementDelegate, "announcementLeadDays", 0);
        Map<String, Object> variables = new java.util.HashMap<>();

        fetchDeliveriesForAnnouncementDelegate.execute(execution(variables));

        assertThat(variables.get("announcementTargetDate")).isEqualTo(today.toString());
        assertThat(variables.get("deliveries"))
                .asList()
                .hasSize(3)
                .allSatisfy(item -> assertThat(item).isInstanceOf(Serializable.class))
                .containsExactly(
                        new DeliveryMonitoringItem("delivery-1", "order-1", "customer-1", today),
                        new DeliveryMonitoringItem("delivery-2", "order-2", "customer-2", today),
                        new DeliveryMonitoringItem("delivery-3", "order-3", "customer-3", today)
                );
    }

    @Test
    void sendDeliveryAnnouncementPostsEnrichedMailPayload() throws IOException {
        ReflectionTestUtils.setField(sendDeliveryAnnouncementDelegate, "mailServiceBaseUrl", "http://mail.test");
        Map<String, Object> variables = new java.util.HashMap<>();
        mailDataEnrichmentService.deliveryAnnouncementEnrichment = execution -> {
            execution.setVariable("recipientEmail", "customer@example.com");
            execution.setVariable("customerName", "ReStock GmbH");
            execution.setVariable("deliveryDateLabel", "10.06.2026");
            execution.setVariable("deliveryWindow", "08:00 - 12:00 Uhr");
            execution.setVariable("orderNumber", "ORD-42");
            execution.setVariable("supplierName", "ReStockOffice");
            execution.setVariable("deliveryLocation", "Hauptstrasse 1");
            execution.setVariable("deliveryItems", List.of(Map.of("name", "Kaffee", "articleNumber", "A-1", "quantity", "2")));
        };

        sendDeliveryAnnouncementDelegate.execute(execution(variables));

        assertThat(mailDataEnrichmentService.deliveryAnnouncementCalls).isEqualTo(1);
        assertThat(restTemplate.postUrl).isEqualTo("http://mail.test/emails/delivery-announcement");
        Map<String, Object> payload = OBJECT_MAPPER.convertValue(restTemplate.postBody, new TypeReference<>() {
        });
        assertThat(payload)
                .containsEntry("recipientEmail", "customer@example.com")
                .containsEntry("customerName", "ReStock GmbH")
                .containsEntry("deliveryDate", "10.06.2026")
                .containsEntry("orderNumber", "ORD-42");
        assertThat(payload.get("deliveryItems")).asList().hasSize(1);
    }

    private DelegateExecution execution(Map<String, Object> variables) {
        return (DelegateExecution) Proxy.newProxyInstance(
                DelegateExecution.class.getClassLoader(),
                new Class<?>[]{DelegateExecution.class},
                (proxy, method, args) -> {
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

        private int deliveryAnnouncementCalls;
        private Consumer<DelegateExecution> deliveryAnnouncementEnrichment = execution -> {
        };

        @Override
        public void enrichDeliveryAnnouncement(DelegateExecution execution) {
            // Simulates data enrichment without calling orders, users, articles or deliveries services.
            deliveryAnnouncementCalls++;
            deliveryAnnouncementEnrichment.accept(execution);
        }

        private void reset() {
            deliveryAnnouncementCalls = 0;
            deliveryAnnouncementEnrichment = execution -> {
            };
        }
    }

    private static class CapturingRestTemplate extends RestTemplate {

        private Object getResponse;
        private String postUrl;
        private Object postBody;

        @Override
        public <T> ResponseEntity<T> exchange(
                String url,
                HttpMethod method,
                HttpEntity<?> requestEntity,
                Class<T> responseType,
                Object... uriVariables
        ) {
            // Feed the fetch delegate with prepared delivery data instead of using a real backend.
            return ResponseEntity.ok(responseType.cast(getResponse));
        }

        @Override
        public <T> ResponseEntity<T> postForEntity(String url, Object request, Class<T> responseType, Object... uriVariables) {
            // Capture the outgoing mail request so the payload can be asserted.
            postUrl = url;
            postBody = request;
            return ResponseEntity.ok().build();
        }
    }
}
