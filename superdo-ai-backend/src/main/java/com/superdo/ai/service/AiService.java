package com.superdo.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.superdo.ai.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class AiService {

    private static final Logger log = LoggerFactory.getLogger(AiService.class);

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final String openAiUrl;

    public AiService(RestTemplate restTemplate,
                     ObjectMapper objectMapper,
                     @Value("${app.openai.api-key:}") String apiKey,
                     @Value("${app.openai.model}") String model,
                     @Value("${app.openai.url}") String openAiUrl) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        this.openAiUrl = openAiUrl;
    }

    public String summarize(String content) {
        return ask("Summarize this note in concise bullet points:", content);
    }

    public String improveGrammar(String content) {
        return ask("Improve grammar and clarity while preserving meaning:", content);
    }

    public String extractActionItems(String content) {
        return ask("Extract actionable tasks as a checklist:", content);
    }

    public String suggestTitle(String content) {
        return ask("Suggest a short title for this note:", content);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private String ask(String instruction, String content) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                    "AI features are not configured. Set OPENAI_API_KEY.");
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        Map<String, Object> body = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system",
                               "content", "You are an assistant for productivity and planning."),
                        Map.of("role", "user",
                               "content", instruction + "\n\n" + content)
                ),
                "temperature", 0.2
        );

        ResponseEntity<String> response;
        try {
            response = restTemplate.exchange(openAiUrl, HttpMethod.POST,
                    new HttpEntity<>(body, headers), String.class);

        } catch (HttpClientErrorException ex) {
            log.warn("OpenAI client error [{}]: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            String providerMessage = extractProviderErrorMessage(ex.getResponseBodyAsString());
            String message = providerMessage.isBlank()
                    ? "AI service returned a client error (" + ex.getStatusCode().value() + ")"
                    : "AI service error (" + ex.getStatusCode().value() + "): " + providerMessage;
            throw new ApiException(HttpStatus.BAD_GATEWAY, message);

        } catch (HttpServerErrorException ex) {
            log.error("OpenAI server error [{}]: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "AI service is temporarily unavailable");

        } catch (ResourceAccessException ex) {
            log.error("OpenAI connection error: {}", ex.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Could not connect to AI service");
        }

        try {
            JsonNode root = objectMapper.readTree(response.getBody());
            String result = root.path("choices").path(0).path("message").path("content").asText();
            if (result.isBlank()) {
                throw new ApiException(HttpStatus.BAD_GATEWAY, "AI service returned an empty response");
            }
            return result;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to parse OpenAI response: {}", ex.getMessage());
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to parse AI service response");
        }
    }

    private String extractProviderErrorMessage(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) {
            return "";
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode msg = root.path("error").path("message");
            if (msg.isTextual()) {
                return msg.asText().trim();
            }
        } catch (Exception ignored) {
            // Ignore parse failures and fall back to generic message.
        }
        return "";
    }
}
