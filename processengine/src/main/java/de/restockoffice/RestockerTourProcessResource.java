package de.restockoffice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.cibseven.bpm.engine.ProcessEngineException;
import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.TaskService;
import org.cibseven.bpm.engine.runtime.ProcessInstance;
import org.cibseven.bpm.engine.task.Task;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/restocker-tour-process")
public class RestockerTourProcessResource {

  private static final Logger LOG = LoggerFactory.getLogger(RestockerTourProcessResource.class);
  private static final String PROCESS_DEFINITION_KEY = "Process_Auslieferung";

  private final RuntimeService runtimeService;
  private final TaskService taskService;
  private final ObjectMapper objectMapper;
  private final Object startLock = new Object();

  // Diese Resource ist der sichere Einstiegspunkt der SPA in den BPMN-Prozess.
  // Die SPA spricht nicht direkt mit /engine-rest, sondern ruft diese API auf.
  public RestockerTourProcessResource(
      RuntimeService runtimeService,
      TaskService taskService,
      ObjectMapper objectMapper) {
    this.runtimeService = runtimeService;
    this.taskService = taskService;
    this.objectMapper = objectMapper;
  }

  @PostMapping("/start")
  public ResponseEntity<StartTourProcessResponse> startOrGetActiveTourProcessFromForm(
      @RequestParam("restockerId") String restockerId,
      @RequestParam(value = "todayDeliveryCount", required = false) Integer todayDeliveryCount) {
    return startOrGetActiveTourProcessFromRequest(
        new StartTourProcessRequest(restockerId, todayDeliveryCount));
  }

  private ResponseEntity<StartTourProcessResponse> startOrGetActiveTourProcessFromRequest(
      StartTourProcessRequest request) {
    String restockerId = request != null ? request.restockerId() : null;
    Integer todayDeliveryCount = request != null ? request.todayDeliveryCount() : null;

    if (restockerId == null || restockerId.isBlank()) {
      return ResponseEntity.badRequest().build();
    }

    try {
      synchronized (startLock) {
        // Pro Restocker soll nur ein aktiver Auslieferungsprozess existieren. Der Business Key
        // ist deshalb die Keycloak-ID des Restockers.
        List<ProcessInstance> activeProcesses = runtimeService
            .createProcessInstanceQuery()
            .processDefinitionKey(PROCESS_DEFINITION_KEY)
            .processInstanceBusinessKey(restockerId)
            .active()
            .list();

        if (!activeProcesses.isEmpty()) {
          ProcessInstance activeProcess = activeProcesses.get(0);
          // Wenn schon ein Prozess läuft, wird er wiederverwendet. Nur die heutige
          // Lieferanzahl wird aktualisiert, damit der Prozess aktuelle Daten hat.
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
    } catch (ProcessEngineException exception) {
      LOG.error(
          "Could not start delivery process for restockerId={} with todayDeliveryCount={}",
          restockerId,
          todayDeliveryCount,
          exception);
      return ResponseEntity
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .body(StartTourProcessResponse.failed("PROCESS_ENGINE_ERROR", exception.getMessage()));
    }
  }

  @PostMapping("/task/find")
  public ResponseEntity<TaskLookupResponse> findTaskFromForm(
      @RequestParam("processInstanceId") String processInstanceId,
      @RequestParam("taskDefinitionKey") String taskDefinitionKey) {
    return findTaskFromRequest(new TaskLookupRequest(processInstanceId, taskDefinitionKey));
  }

  private ResponseEntity<TaskLookupResponse> findTaskFromRequest(TaskLookupRequest request) {
    if (request == null || isBlank(request.processInstanceId()) || isBlank(request.taskDefinitionKey())) {
      return ResponseEntity.badRequest().build();
    }

    List<Task> tasks = taskService
        .createTaskQuery()
        .processInstanceId(request.processInstanceId())
        .taskDefinitionKey(request.taskDefinitionKey())
        .list();
    String taskId = tasks.isEmpty() ? null : tasks.get(0).getId();

    // count hilft der SPA zu unterscheiden, ob keine, genau eine oder mehrere
    // passende User Tasks gefunden wurden.
    return ResponseEntity.ok(new TaskLookupResponse(taskId, tasks.size()));
  }

  @PostMapping("/task/complete")
  public ResponseEntity<Void> completeTaskFromForm(
      @RequestParam("taskId") String taskId,
      @RequestParam(value = "variablesJson", required = false) String variablesJson) throws JsonProcessingException {
    Map<String, ProcessVariable> variables = isBlank(variablesJson)
        ? Map.of()
        : objectMapper.readValue(
            variablesJson,
            objectMapper.getTypeFactory().constructMapType(
                Map.class,
                String.class,
                ProcessVariable.class));

    return completeTaskFromRequest(new CompleteTaskRequest(taskId, variables));
  }

  private ResponseEntity<Void> completeTaskFromRequest(CompleteTaskRequest request) {
    if (request == null || isBlank(request.taskId())) {
      return ResponseEntity.badRequest().build();
    }

    // Beim Abschließen werden nur die Werte an CIB seven übergeben. Die type-Felder
    // stammen aus der alten REST-Struktur und bleiben im Frontend als Dokumentation erhalten.
    taskService.complete(request.taskId(), toProcessVariables(request.variables()));

    return ResponseEntity.noContent().build();
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

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private StartTourProcessResponse toResponse(ProcessInstance processInstance, boolean started) {
    return new StartTourProcessResponse(processInstance.getProcessInstanceId(), started);
  }

  public record StartTourProcessRequest(String restockerId, Integer todayDeliveryCount) {
  }

  public record StartTourProcessResponse(String id, boolean started, String errorCode, String message) {
    public StartTourProcessResponse(String id, boolean started) {
      this(id, started, null, null);
    }

    public static StartTourProcessResponse failed(String errorCode, String message) {
      return new StartTourProcessResponse(null, false, errorCode, message);
    }
  }

  public record TaskLookupRequest(String processInstanceId, String taskDefinitionKey) {
  }

  public record TaskLookupResponse(String id, int count) {
  }

  public record CompleteTaskRequest(String taskId, Map<String, ProcessVariable> variables) {
  }

  public record ProcessVariable(Object value, String type) {
  }
}
