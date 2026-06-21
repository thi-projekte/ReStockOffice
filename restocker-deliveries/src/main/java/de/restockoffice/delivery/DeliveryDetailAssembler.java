package de.restockoffice.delivery;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import de.restockoffice.article.ArticleClient;
import de.restockoffice.article.ArticleDto;
import de.restockoffice.user.UserClient;
import de.restockoffice.user.UserDto;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.logging.Logger;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@ApplicationScoped
public class DeliveryDetailAssembler {

    private static final Logger LOG = Logger.getLogger(DeliveryDetailAssembler.class);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String DEFAULT_UNIT = "Stück";

    @Inject
    @RestClient
    UserClient userClient;

    @Inject
    @RestClient
    ArticleClient articleClient;

    public List<DeliveryDetailDto> toDetailDtos(List<Delivery> deliveries, String authorizationHeader) {
        Map<String, UserDto> userCache = new HashMap<>();
        Map<String, ArticleDto> articleCache = new HashMap<>();
        AuthenticatedRestocker authenticatedRestocker = authenticatedRestocker(authorizationHeader);

        return deliveries.stream()
                .map(delivery -> toDetailDto(
                        delivery,
                        loadCachedUser(delivery.userId, userCache, authorizationHeader),
                        articleCache,
                        authenticatedRestocker
                ))
                .collect(Collectors.toList());
    }

    public DeliveryDetailDto toDetailDtoWithFreshData(Delivery delivery, String authorizationHeader) {
        return toDetailDto(
                delivery,
                tryLoadUser(delivery.userId, authorizationHeader),
                new HashMap<>(),
                authenticatedRestocker(authorizationHeader)
        );
    }

    private DeliveryDetailDto toDetailDto(
            Delivery delivery,
            UserDto user,
            Map<String, ArticleDto> articleCache,
            AuthenticatedRestocker authenticatedRestocker
    ) {
        DeliveryDetailDto dto = new DeliveryDetailDto();
        dto.setId(delivery.id);
        dto.setOrderId(delivery.orderId);
        dto.setUserId(delivery.userId);
        dto.setStopOrder(delivery.stopOrder);
        dto.setCollected(delivery.collected);
        dto.setCollectedAt(delivery.collectedAt);
        dto.setAcceptedAt(delivery.acceptedAt);
        dto.setDeliveredAt(delivery.deliveredAt);
        dto.setRestockerName(restockerDisplayName(delivery, authenticatedRestocker));
        dto.setStatus(deliveryStatus(delivery));
        dto.setRecipientEmail(valueOrEmpty(valueOrFallback(delivery.recipientEmail, user != null ? user.getEmail() : null)));
        dto.setCompanyName(valueOrEmpty(user != null ? user.getCompanyName() : null));
        dto.setStreet(valueOrEmpty(user != null ? user.getStreet() : null));
        dto.setHouseNumber(valueOrEmpty(user != null ? user.getHouseNumber() : null));
        dto.setPostalCode(valueOrEmpty(user != null ? user.getPostalCode() : null));
        dto.setCity(valueOrEmpty(user != null ? user.getCity() : null));
        dto.setCountry(valueOrEmpty(user != null ? user.getCountry() : null));
        dto.setPhoneNumber(valueOrEmpty(user != null ? user.getPhoneNumber() : null));
        dto.setContactPerson(valueOrEmpty(user != null ? user.getRoleInCompany() : null));
        dto.setDeliveryHint(valueOrEmpty(user != null ? user.getDeliveryHint() : null));
        dto.setDeliveryDay(valueOrEmpty(user != null ? user.getDeliveryDay() : null));
        dto.setDeliveryTime(valueOrEmpty(user != null ? user.getDeliveryTime() : null));
        dto.setDeliveryDate(requireDeliveryDate(delivery).toString());
        dto.setItems(toDetailItems(delivery, articleCache));
        return dto;
    }

    private List<DeliveryDetailDto.DeliveryItemDetailDto> toDetailItems(
            Delivery delivery,
            Map<String, ArticleDto> articleCache
    ) {
        return delivery.items.stream()
                .map(item -> toDetailItem(item, articleCache))
                .collect(Collectors.toList());
    }

    private DeliveryDetailDto.DeliveryItemDetailDto toDetailItem(
            DeliveryItem item,
            Map<String, ArticleDto> articleCache
    ) {
        ArticleDto article = loadArticle(item.articleNumber, articleCache);
        DeliveryDetailDto.DeliveryItemDetailDto detailItem = new DeliveryDetailDto.DeliveryItemDetailDto();
        detailItem.setId(item.id);
        detailItem.setArticleNumber(item.articleNumber);
        detailItem.setDelivered(item.delivered);
        detailItem.setName(valueOrFallback(item.name, article != null ? article.getName() : fallbackArticleName(item.articleNumber)));
        detailItem.setQuantity(item.quantity);
        detailItem.setUnit(valueOrFallback(item.unit, article != null ? article.getUnit() : DEFAULT_UNIT));
        return detailItem;
    }

    private UserDto loadCachedUser(String userId, Map<String, UserDto> userCache, String authorizationHeader) {
        if (!userCache.containsKey(userId)) {
            userCache.put(userId, tryLoadUser(userId, authorizationHeader));
        }
        return userCache.get(userId);
    }

    private UserDto tryLoadUser(String userId, String authorizationHeader) {
        try {
            return userClient.getCustomerAddressForRestocker(userId, authorizationHeader);
        } catch (RuntimeException exception) {
            try {
                return userClient.getCustomerProfile(userId, authorizationHeader);
            } catch (RuntimeException fallbackException) {
                LOG.warnf(fallbackException, "Could not load customer profile for delivery details: %s", userId);
                return null;
            }
        }
    }

    private ArticleDto loadArticle(String articleNumber, Map<String, ArticleDto> articleCache) {
        if (isBlank(articleNumber)) {
            return null;
        }
        if (!articleCache.containsKey(articleNumber)) {
            articleCache.put(articleNumber, tryLoadArticle(articleNumber));
        }
        return articleCache.get(articleNumber);
    }

    private ArticleDto tryLoadArticle(String articleNumber) {
        try {
            return articleClient.getArticleByProductId(articleNumber);
        } catch (RuntimeException exception) {
            return null;
        }
    }

    private String deliveryStatus(Delivery delivery) {
        if (delivery.deliveredAt != null) return "DELIVERED";
        if (delivery.collected) return "COLLECTED";
        return delivery.tour != null || delivery.acceptedAt != null ? "ACCEPTED" : "OPEN";
    }

    private String restockerDisplayName(Delivery delivery, AuthenticatedRestocker authenticatedRestocker) {
        if (delivery.tour == null || isBlank(delivery.tour.restockerName)) return null;
        if (authenticatedRestocker != null && delivery.tour.restockerName.equals(authenticatedRestocker.username())
                && !isBlank(authenticatedRestocker.displayName())) return authenticatedRestocker.displayName();
        return delivery.tour.restockerName;
    }

    private AuthenticatedRestocker authenticatedRestocker(String authorizationHeader) {
        String token = bearerToken(authorizationHeader);
        if (isBlank(token)) return null;
        String[] parts = token.split("\\.");
        if (parts.length < 2) return null;
        try {
            JsonNode claims = OBJECT_MAPPER.readTree(new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8));
            return new AuthenticatedRestocker(
                    firstNonBlank(textClaim(claims, "preferred_username"), textClaim(claims, "sub")),
                    firstNonBlank(joinName(textClaim(claims, "given_name"), textClaim(claims, "family_name")), textClaim(claims, "name"))
            );
        } catch (Exception ignored) {
            return null;
        }
    }

    private String bearerToken(String authorizationHeader) {
        return isBlank(authorizationHeader) || !authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)
                ? null : authorizationHeader.substring(7).trim();
    }

    private String textClaim(JsonNode claims, String claimName) {
        JsonNode claim = claims != null ? claims.get(claimName) : null;
        return claim != null && claim.isTextual() ? claim.asText() : null;
    }

    private String joinName(String firstName, String lastName) {
        return firstNonBlank((valueOrEmpty(firstName) + " " + valueOrEmpty(lastName)).trim(), null);
    }

    private java.time.LocalDate requireDeliveryDate(Delivery delivery) {
        if (delivery.deliveryDate == null) throw new IllegalStateException("Delivery hat kein deliveryDate: " + delivery.id);
        return delivery.deliveryDate;
    }

    private String valueOrEmpty(String value) { return value == null ? "" : value; }
    private String valueOrFallback(String value, String fallback) { return isBlank(value) ? fallback : value; }
    private String fallbackArticleName(String articleNumber) { return "Artikel " + articleNumber; }
    private boolean isBlank(String value) { return value == null || value.isBlank(); }
    private String firstNonBlank(String... values) {
        for (String value : values) if (!isBlank(value)) return value;
        return null;
    }

    private record AuthenticatedRestocker(String username, String displayName) { }
}
