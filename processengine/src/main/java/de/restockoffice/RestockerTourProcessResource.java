package de.restockoffice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;

import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.runtime.ProcessInstance;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/restocker-tour-process")
public class RestockerTourProcessResource {

  private static final String PROCESS_DEFINITION_KEY = "Process_0h5mosh";

  private final RuntimeService runtimeService;
  private final ObjectMapper objectMapper;
  private final Object startLock = new Object();

  public RestockerTourProcessResource(RuntimeService runtimeService, ObjectMapper objectMapper) {
    this.runtimeService = runtimeService;
    this.objectMapper = objectMapper;
  }

  @PostMapping(value = "/start", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<StartTourProcessResponse> startOrGetActiveTourProcess(
      @RequestBody StartTourProcessRequest request) {
    return startOrGetActiveTourProcessFromRequest(request);
  }

  @PostMapping(value = "/start", consumes = MediaType.TEXT_PLAIN_VALUE)
  public ResponseEntity<StartTourProcessResponse> startOrGetActiveTourProcessFromText(
      @RequestBody String requestBody) throws JsonProcessingException {
    return startOrGetActiveTourProcessFromRequest(
        objectMapper.readValue(requestBody, StartTourProcessRequest.class));
  }

  private ResponseEntity<StartTourProcessResponse> startOrGetActiveTourProcessFromRequest(
      StartTourProcessRequest request) {
    String restockerId = request != null ? request.restockerId() : null;
    Integer todayDeliveryCount = request != null ? request.todayDeliveryCount() : null;

    if (restockerId == null || restockerId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }

    synchronized (startLock) {
      List<ProcessInstance> activeProcesses = runtimeService
          .createProcessInstanceQuery()
          .processDefinitionKey(PROCESS_DEFINITION_KEY)
          .processInstanceBusinessKey(restockerId)
          .active()
          .list();

      if (!activeProcesses.isEmpty()) {
        ProcessInstance activeProcess = activeProcesses.get(0);
        runtimeService.setVariable(
            activeProcess.getProcessInstanceId(),
            "todayDeliveryCount",
            todayDeliveryCount != null ? todayDeliveryCount : 0);
        return ResponseEntity.ok(toResponse(activeProcess, false));
      }

      ProcessInstance processInstance = runtimeService
          .createProcessInstanceByKey(PROCESS_DEFINITION_KEY)
          .businessKey(restockerId)
          .setVariable("restockerId", restockerId)
          .setVariable("todayDeliveryCount", todayDeliveryCount != null ? todayDeliveryCount : 0)
          .execute();

      return ResponseEntity.ok(toResponse(processInstance, true));
    }
  }

  private StartTourProcessResponse toResponse(ProcessInstance processInstance, boolean started) {
    return new StartTourProcessResponse(processInstance.getProcessInstanceId(), started);
  }

  public record StartTourProcessRequest(String restockerId, Integer todayDeliveryCount) {
  }

  public record StartTourProcessResponse(String id, boolean started) {
  }
}
