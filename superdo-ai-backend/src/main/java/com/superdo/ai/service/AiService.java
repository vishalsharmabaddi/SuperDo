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
    private static final String SUPERDOX_ASSISTANT_PROMPT = """
            You are an AI assistant embedded inside a web application called Superdox AI.
            Superdox AI is a personal productivity and life management platform.

            You know these modules:
            1. General Notes: for saving work ideas, personal thoughts, reminders, and searchable notes. Users can pin notes and filter by categories like Work, Personal, or Ideas.
            2. Rent Manager: for tracking rent payments, due dates, paid or pending status, monthly records, and PDF export.
            3. Celebration Planner: for planning weddings, anniversaries, birthdays, festivals, and tracking progress from upcoming to completed.
            4. Expense Tracker: for tracking income, expenses, savings, budgets, monthly overview, and category breakdowns.
            5. Loan Manager: for managing loans, lenders, interest rate, tenure, start date, and EMI calculations.
            6. Custom Sections: for creating flexible user-defined trackers like medicine logs, book lists, workout logs, or anything else.
            7. Global Search: for searching across all modules at once.

            Your job:
            - understand what the user wants
            - guide them to the right Superdox module
            - help them think through what information they need to enter
            - give practical suggestions based on the app's structure
            - answer as if you live inside this app

            Style:
            - warm, practical, and conversational
            - short and helpful by default
            - not robotic
            - if the user is unclear, ask one simple follow-up question
            - do not claim access to saved user data unless the user explicitly shares it
            - when relevant, suggest the exact module to use
            """;

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

    public String assistantReply(String message) {
        if (apiKey == null || apiKey.isBlank()) {
            return localAssistantReply(message);
        }
        try {
            return ask("Reply as the embedded Superdox AI assistant using the platform context below.\n\n"
                    + SUPERDOX_ASSISTANT_PROMPT, message);
        } catch (Exception ex) {
            return localAssistantReply(message);
        }
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
                               "content", SUPERDOX_ASSISTANT_PROMPT),
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

    private String localAssistantReply(String message) {
        String text = message == null ? "" : message.trim();
        if (text.isBlank()) {
            return "Tell me what you want to manage in Superdox AI, and I will guide you to the right module.";
        }

        String lower = text.toLowerCase();
        if (lower.contains("hello") || lower.contains("hi") || lower.contains("hey")) {
            return "Hello. I can help you use General Notes, Rent Manager, Celebration Planner, Expense Tracker, Loan Manager, or Custom Sections. What are you trying to manage?";
        }

        if (matchesAny(lower, "note", "idea", "save something", "remind me", "write this down")) {
            return "Use General Notes for that. You can save it, choose a category like Work, Personal, or Ideas, and pin it if it is important.";
        }

        if (matchesAny(lower, "rent", "tenant", "landlord", "paid rent", "rent due", "rent payment")) {
            return "Use Rent Manager. Add who paid, who received, the amount, due date, and whether it is paid or pending.";
        }

        if (matchesAny(lower, "wedding", "anniversary", "birthday", "festival", "celebration", "party")) {
            return "Celebration Planner fits that best. Add each celebration task or item, then track whether it is upcoming or completed.";
        }

        if (matchesAny(lower, "expense", "budget", "income", "saving", "spending", "money")) {
            return "Use Expense Tracker. Add your income and expenses, set a monthly budget, and check where your money is going.";
        }

        if (matchesAny(lower, "loan", "emi", "interest", "bank", "repayment")) {
            return "Loan Manager is the right module. You will need the loan name, lender, total amount, interest rate, tenure, and start date.";
        }

        if (matchesAny(lower, "custom", "medicine tracker", "book list", "workout", "my own section")) {
            return "Use Custom Sections for that. You can build your own tracker with fields like text, number, date, dropdown, checkbox, file upload, or textarea.";
        }

        if (matchesAny(lower, "search", "find across", "where is my data")) {
            return "Use the global search bar at the top to search across all modules at once.";
        }

        if (matchesAny(lower, "plan", "schedule", "organize", "how do i start")) {
            return "Tell me what you want to manage, and I will point you to the right module and what details to add first.";
        }

        return "I can guide you inside Superdox AI. Tell me whether you want help with notes, rent, celebrations, expenses, loans, or a custom tracker.";
    }

    private boolean matchesAny(String text, String... terms) {
        for (String term : terms) {
            if (text.contains(term)) {
                return true;
            }
        }
        return false;
    }
}
