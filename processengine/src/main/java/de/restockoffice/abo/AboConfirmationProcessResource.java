package de.restockoffice.abo;

import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.runtime.ProcessInstance;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/abo-confirmation-process")
public class AboConfirmationProcessResource {

    private static final String PROCESS_DEFINITION_KEY = "Process_aboConfirmation";
    private static final String ORDER_SNAPSHOTS_VARIABLE = "orderSnapshots";

    private final RuntimeService runtimeService;
    private final Object startLock = new Object();

    public AboConfirmationProcessResource(RuntimeService runtimeService) {
        this.runtimeService = runtimeService;
    }

    @PostMapping("/change")
    public ResponseEntity<AboConfirmationProcessResponse> startOrAppend(
            @RequestBody AboConfirmationProcessRequest request) {
        if (request == null || isBlank(request.businessKey())) {
            return ResponseEntity.badRequest().build();
        }

        Map<String, Object> variables = toProcessVariables(request.variables());
        String orderId = stringValue(variables.get("orderId"));
        Map<String, Map<String, Object>> orderSnapshots = appendOrderSnapshot(null, orderId, variables);

        synchronized (startLock) {
            List<ProcessInstance> activeProcesses = runtimeService.createProcessInstanceQuery()
                    .processDefinitionKey(PROCESS_DEFINITION_KEY).processInstanceBusinessKey(request.businessKey())
                    .active().list();
            ProcessInstance activeProcess = activeProcesses.isEmpty() ? null : activeProcesses.get(0);

            if (activeProcess != null) {
                String processInstanceId = activeProcess.getProcessInstanceId();
                String currentOrderIds = stringValue(runtimeService.getVariable(processInstanceId, "orderIdsCsv"));
                orderSnapshots = appendOrderSnapshot(
                        runtimeService.getVariable(processInstanceId, ORDER_SNAPSHOTS_VARIABLE), orderId, variables);
                variables.put("orderIdsCsv", appendOrderId(currentOrderIds, orderId));
                variables.put(ORDER_SNAPSHOTS_VARIABLE, orderSnapshots);
                runtimeService.setVariables(processInstanceId, variables);
                return ResponseEntity.ok(new AboConfirmationProcessResponse(processInstanceId, false));
            }

            variables.put("orderIdsCsv", appendOrderId("", orderId));
            variables.put(ORDER_SNAPSHOTS_VARIABLE, orderSnapshots);
            ProcessInstance processInstance = runtimeService.createProcessInstanceByKey(PROCESS_DEFINITION_KEY)
                    .businessKey(request.businessKey()).setVariables(variables).execute();

            return ResponseEntity.ok(new AboConfirmationProcessResponse(processInstance.getProcessInstanceId(), true));
        }
    }

    private Map<String, Object> toProcessVariables(Map<String, ProcessVariable> variables) {
        Map<String, Object> processVariables = new LinkedHashMap<>();
        if (variables == null) {
            return processVariables;
        }

        variables.forEach((name, variable) -> {
            if (!isBlank(name) && variable != null) {
                processVariables.put(name, variable.value());
            }
        });

        return processVariables;
    }

    private String appendOrderId(String orderIdsCsv, String orderId) {
        List<String> orderIds = new ArrayList<>();

        if (!isBlank(orderIdsCsv)) {
            for (String value : orderIdsCsv.split(",")) {
                String normalizedValue = value.trim();
                if (!normalizedValue.isBlank() && !orderIds.contains(normalizedValue)) {
                    orderIds.add(normalizedValue);
                }
            }
        }

        if (!isBlank(orderId) && !orderIds.contains(orderId)) {
            orderIds.add(orderId);
        }

        return String.join(",", orderIds);
    }

    private Map<String, Map<String, Object>> appendOrderSnapshot(Object existingSnapshots, String orderId,
            Map<String, Object> variables) {
        Map<String, Map<String, Object>> snapshots = new LinkedHashMap<>();

        if (existingSnapshots instanceof Map<?, ?> existingMap) {
            existingMap.forEach((key, value) -> {
                if (key == null || !(value instanceof Map<?, ?> snapshotMap)) {
                    return;
                }

                Map<String, Object> snapshot = new LinkedHashMap<>();
                snapshotMap.forEach((snapshotKey, snapshotValue) -> {
                    if (snapshotKey != null) {
                        snapshot.put(String.valueOf(snapshotKey), snapshotValue);
                    }
                });
                snapshots.put(String.valueOf(key), snapshot);
            });
        }

        if (!isBlank(orderId)) {
            Map<String, Object> existingSnapshot = snapshots.get(orderId);
            Map<String, Object> snapshot = new LinkedHashMap<>();
            putIfPresent(snapshot, "orderId", variables.get("orderId"));
            putIfPresent(snapshot, "customerId", variables.get("customerId"));
            putIfPresent(snapshot, "productId", variables.get("productId"));
            putIfPresent(snapshot, "firstChangeType",
                    firstNonBlank(
                            stringValue(existingSnapshot != null ? existingSnapshot.get("firstChangeType") : null),
                            stringValue(variables.get("changeType"))));
            putIfPresent(snapshot, "changeType", variables.get("changeType"));
            putIfPresent(snapshot, "status", variables.get("status"));
            putIfPresent(snapshot, "quantity", variables.get("quantity"));
            putIfPresent(snapshot, "interval", variables.get("interval"));
            snapshots.put(orderId, snapshot);
        }

        return snapshots;
    }

    private void putIfPresent(Map<String, Object> target, String key, Object value) {
        if (value != null) {
            target.put(key, value);
        }
    }

    private String stringValue(Object value) {
        return value != null ? String.valueOf(value) : null;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }

        for (String value : values) {
            if (!isBlank(value)) {
                return value.trim();
            }
        }

        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public record AboConfirmationProcessRequest(String businessKey, Map<String, ProcessVariable> variables) {
    }

    public record AboConfirmationProcessResponse(String id, boolean started) {
    }

    public record ProcessVariable(Object value, String type) {
    }
}
