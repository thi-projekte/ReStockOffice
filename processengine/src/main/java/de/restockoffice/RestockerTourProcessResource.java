package de.restockoffice;

import java.util.List;

import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.runtime.ProcessInstance;
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
  private final Object startLock = new Object();

  public RestockerTourProcessResource(RuntimeService runtimeService) {
    this.runtimeService = runtimeService;
  }

  @PostMapping("/start")
  public ResponseEntity<StartTourProcessResponse> startOrGetActiveTourProcess(
      @RequestBody StartTourProcessRequest request) {
    String restockerId = request != null ? request.restockerId() : null;

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
        return ResponseEntity.ok(toResponse(activeProcesses.get(0), false));
      }

      ProcessInstance processInstance = runtimeService
          .createProcessInstanceByKey(PROCESS_DEFINITION_KEY)
          .businessKey(restockerId)
          .setVariable("restockerId", restockerId)
          .execute();

      return ResponseEntity.ok(toResponse(processInstance, true));
    }
  }

  private StartTourProcessResponse toResponse(ProcessInstance processInstance, boolean started) {
    return new StartTourProcessResponse(processInstance.getProcessInstanceId(), started);
  }

  public record StartTourProcessRequest(String restockerId) {
  }

  public record StartTourProcessResponse(String id, boolean started) {
  }
}
