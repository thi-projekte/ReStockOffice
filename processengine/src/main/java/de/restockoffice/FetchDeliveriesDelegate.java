package de.restockoffice;

import org.cibseven.bpm.engine.delegate.DelegateExecution;
import org.cibseven.bpm.engine.delegate.JavaDelegate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

// import java.util.List;
// import java.util.Map;

@Component("fetchDeliveriesDelegate")
public class FetchDeliveriesDelegate implements JavaDelegate {

    // Anpassen zum eigentlichen Delivery Service !!!
    //
    // @Autowired
    // private DeliveryService deliveryService;
    //
    // @Override
    // public void execute(DelegateExecution execution) throws Exception {
    //
    //     // Lieferungen für heute holen, gruppiert nach Kunde !!! noch anpassen zum Delivery Service
    //     List<Map<String, Object>> customers = deliveryService.getDeliveriesForToday();
    //
    //     // Als Prozessvariable speichern – muss eine java.util.List sein!
    //     execution.setVariable("customers", customers);
    // }

    @Override
    public void execute(DelegateExecution execution) {
        execution.setVariable("customers", java.util.List.of());
    }
}
