package de.restockoffice;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.cibseven.bpm.engine.RuntimeService;
import org.cibseven.bpm.engine.TaskService;
import org.cibseven.bpm.engine.runtime.ProcessInstance;
import org.cibseven.bpm.engine.task.Task;
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
  private final TaskService taskService;
  private final ObjectMapper objectMapper;
  private final Object startLock = new Object();

  public RestockerTourProcessResource(
      RuntimeService runtimeService,
      TaskService taskService,
      ObjectMapper objectMapper) {
    this.runtimeService = runtimeService;
    this.taskService = taskService;
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

  @PostMapping(value = "/task/find", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<TaskLookupResponse> findTask(@RequestBody TaskLookupRequest request) {
    return findTaskFromRequest(request);
  }

  @PostMapping(value = "/task/find", consumes = MediaType.TEXT_PLAIN_VALUE)
  public ResponseEntity<TaskLookupResponse> findTaskFromText(@RequestBody String requestBody)
      throws JsonProcessingException {
    return findTaskFromRequest(objectMapper.readValue(requestBody, TaskLookupRequest.class));
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

    return ResponseEntity.ok(new TaskLookupResponse(taskId, tasks.size()));
  }

  @PostMapping(value = "/task/complete", consumes = MediaType.APPLICATION_JSON_VALUE)
  public ResponseEntity<Void> completeTask(@RequestBody CompleteTaskRequest request) {
    return completeTaskFromRequest(request);
  }

  @PostMapping(value = "/task/complete", consumes = MediaType.TEXT_PLAIN_VALUE)
  public ResponseEntity<Void> completeTaskFromText(@RequestBody String requestBody)
      throws JsonProcessingException {
    return completeTaskFromRequest(objectMapper.readValue(requestBody, CompleteTaskRequest.class));
  }

  private ResponseEntity<Void> completeTaskFromRequest(CompleteTaskRequest request) {
    if (request == null || isBlank(request.taskId())) {
      return ResponseEntity.badRequest().build();
    }

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

  public record StartTourProcessResponse(String id, boolean started) {
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
