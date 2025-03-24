package sg.nus.iss.final_project.Util;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.List;

/**
 * Utility class to handle date conversions between frontend and backend
 */
public class DateUtil {

    // ISO-8601 format used by JavaScript Date.toISOString()
    private static final DateTimeFormatter ISO_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

    // Common date formats to try when parsing
    private static final List<DateTimeFormatter> COMMON_FORMATS = Arrays.asList(
            ISO_FORMAT,
            DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'Z'"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("MM/dd/yyyy"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"));

    /**
     * Convert LocalDateTime to ISO-8601 string format
     */
    public static String toIsoString(LocalDateTime dateTime) {
        if (dateTime == null)
            return null;
        return dateTime.atOffset(ZoneOffset.UTC).format(ISO_FORMAT);
    }

    /**
     * Parse date string from various formats to LocalDateTime
     * Attempts multiple formats for robustness
     */
    public static LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }

        // Try each format until one works
        for (DateTimeFormatter formatter : COMMON_FORMATS) {
            try {
                return LocalDateTime.parse(dateStr, formatter);
            } catch (DateTimeParseException e) {
                // Try next format
            }
        }

        // If no format worked, try Java's built-in parsing
        try {
            return LocalDateTime.parse(dateStr);
        } catch (DateTimeParseException e) {
            // Fall back to current date time if all parsing fails
            return LocalDateTime.now();
        }
    }
}