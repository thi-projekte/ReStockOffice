package de.restockoffice;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;

public class OrderServiceMockResource implements QuarkusTestResourceLifecycleManager {

    private HttpServer server;

    @Override
    public Map<String, String> start() {
        try {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/", this::handleRequest);
            server.start();

            String baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
            return Map.of("processengine.abo-confirmation-start-url", baseUrl + "/api/abo-confirmation-process/change",
                    "deliveriesservice.base-url", baseUrl, "usersservice.base-url", baseUrl);
        } catch (IOException exception) {
            throw new IllegalStateException("Could not start orders test mock server", exception);
        }
    }

    @Override
    public void stop() {
        if (server != null) {
            server.stop(0);
        }
    }

    private void handleRequest(HttpExchange exchange) throws IOException {
        byte[] response = "{}".getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.length);
        exchange.getResponseBody().write(response);
        exchange.close();
    }
}
