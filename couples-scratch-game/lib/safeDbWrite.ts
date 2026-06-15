import { Alert } from "react-native";

/**
 * Wraps a database write operation with error handling.
 * On failure: shows an error alert and returns null (caller should NOT update in-memory state).
 * On success: returns the operation result.
 *
 * Validates: Requirements 15.6, 15.7
 */
export async function safeDbWrite<T>(
  operation: () => Promise<T>,
  errorMessage = "Data could not be saved. Please try again."
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    Alert.alert("Error", errorMessage);
    return null;
  }
}
