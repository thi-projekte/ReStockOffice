@Component("sendDeliveryConfirmationDelegate")
public class SendDeliveryConfirmationDelegate implements JavaDelegate {

    private static final Logger log = LoggerFactory.getLogger(SendDeliveryConfirmationDelegate.class);

    @Value("${mailservice.base-url}")
    private String mailServiceBaseUrl;

    @Override
    public void execute(DelegateExecution execution) {
        log.info("Sending delivery confirmation for process instance {}", execution.getProcessInstanceId());

        var request = Map.of(
                "recipientEmail",      execution.getVariable("recipientEmail"),
                "customerName",        execution.getVariable("customerName"),
                "daysUntilDelivery",   "1",
                "deliveryDate",        execution.getVariable("deliveryDate"),
                "deliveryWindow",      execution.getVariable("deliveryWindow"),
                "officeLocation",      execution.getVariable("officeLocation"),
                "orderNumber",         execution.getVariable("orderId"),
                "supplierName",        "ReStockOffice Logistics",
                "deliveryLocation",    execution.getVariable("deliveryLocation"),
                "deskDetails",         execution.getVariable("deskDetails"),
                "onSiteContact",       execution.getVariable("onSiteContact"),
                "deliveryInstructions","Bitte Zugang über Haupteingang anmelden.",
                "deliveryItems",       List.of(
                        Map.of(
                                "name", "Artikel",
                                "articleNumber", "ART-001",
                                "quantity", "1"
                        )
                )
        );

        new RestTemplate().postForEntity(
                mailServiceBaseUrl + "/emails/delivery-announcement",
                request,
                String.class
        );

        log.info("Delivery confirmation sent for {}", execution.getVariable("recipientEmail"));
    }
}
