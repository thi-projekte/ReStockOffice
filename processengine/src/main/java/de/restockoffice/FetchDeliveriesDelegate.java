package de.restockoffice;

@Component("fetchDeliveriesDelegate")
public class FetchDeliveriesDelegate implements JavaDelegate {

    // Anpassen zum eigentlichen Delivery Service !!!
    @Autowired
    private DeliveryService deliveryService;

    @Override
    public void execute(DelegateExecution execution) throws Exception {

        // Lieferungen für heute holen, gruppiert nach Kunde !!! noch anpassen zum Delivery Service
        List<Map<String, Object>> customers = deliveryService.getDeliveriesForToday();

        // Als Prozessvariable speichern – muss eine java.util.List sein!
        execution.setVariable("customers", customers);
    }
}