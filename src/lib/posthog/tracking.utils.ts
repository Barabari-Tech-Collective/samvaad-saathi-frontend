// utils/posthog.ts
"use client";

import posthog from "posthog-js";
import { EVENTS } from "./events";

// Type definitions
interface EventProperties {
  [key: string]: unknown;
}

interface UserProperties {
  [key: string]: unknown;
}

interface ErrorProperties {
  [key: string]: unknown;
}

/**
 * Track custom events
 *
 * @param eventName - The name of the event to track
 * @param properties - Additional properties to include with the event
 *
 * @example
 * ```typescript
 * trackEvent("button_clicked", {
 *   button_name: "subscribe",
 *   location: "header"
 * });
 * ```
 */
export const trackEvent = (eventName: string, properties: EventProperties = {}): void => {
  if (typeof window !== "undefined") {
    posthog.capture(eventName, properties);
  }
};

/**
 * Identify users
 *
 * @param userId - The user's ID
 * @param properties - The properties to identify the user with
 *
 * @example
 * ```typescript
 * identifyUser("user123", {
 *   email: "user@example.com",
 *   name: "John Doe",
 *   plan: "premium"
 * });
 * ```
 */
export const identifyUser = (userId: string, properties: UserProperties = {}): void => {
  if (typeof window !== "undefined") {
    posthog.identify(userId, properties);
  }
};

/**
 * Track errors manually
 *
 * @param error - The error object to track
 * @param additionalProperties - Additional context properties for the error
 *
 * @example
 * ```typescript
 * try {
 *   // some operation
 * } catch (error) {
 *   trackError(error as Error, {
 *     operation: "file_upload",
 *     file_size: "2MB"
 *   });
 * }
 * ```
 */
export const trackError = (error: Error, additionalProperties: ErrorProperties = {}): void => {
  if (typeof window !== "undefined") {
    posthog.captureException(error, additionalProperties);
  }
};

/**
 * Track API errors with context
 *
 * @param error - The API error object
 * @param context - Additional context about the API call
 *
 * @example
 * ```typescript
 * try {
 *   const response = await apiCall();
 * } catch (error) {
 *   trackApiError(error as AxiosError, {
 *     endpoint: "/api/interviews",
 *     method: "POST",
 *     operation: "create_interview",
 *     status_code: error.response?.status
 *   });
 * }
 * ```
 *
 * @note This function automatically tracks API errors in both mutation and query operations
 * when using the createApiClient hook. You can also call it manually for custom error handling.
 */
export const trackApiError = (
  error: Error,
  context: {
    endpoint?: string;
    method?: string;
    operation?: string;
    status_code?: number;
    request_id?: string;
    user_id?: string;
  } = {}
): void => {
  if (typeof window !== "undefined") {
    const errorProperties = {
      error_type: "api_error",
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    };

    posthog.captureException(error, errorProperties);
    // Also track as a custom event for better filtering
    trackEvent(EVENTS.API_ERROR, errorProperties);
  }
};

/**
 * Track button clicks
 *
 * @param buttonName - The name/identifier of the button
 * @param location - The location/context where the button was clicked
 *
 * @example
 * ```typescript
 * trackButtonClick("subscribe", "header");
 * trackButtonClick("download", "landing_page");
 * trackButtonClick("contact_us", "footer");
 * ```
 */
export const trackButtonClick = (
  buttonName: string,
  location: string,
  properties: EventProperties = {}
): void => {
  trackEvent("button_clicked", {
    button_name: buttonName,
    location,
    ...properties,
  });
};

/**
 * Reset user identification
 *
 * @example
 * ```typescript
 * // Call when user logs out
 * resetUser();
 * ```
 */
export const resetUser = (): void => {
  if (typeof window !== "undefined") {
    posthog.reset();
  }
};

// Authentication tracking functions
/**
 * Track login attempts
 *
 * @param loginMethod - The method used for login ("Google", "Apple", "Email")
 * @param screenSource - The screen where login was initiated ("login", "create_account")
 *
 * @example
 * ```typescript
 * trackLoginAttempt("Google", "create_account");
 * trackLoginAttempt("Email", "login");
 * trackLoginAttempt("Apple", "create_account");
 * ```
 */
export const trackLoginAttempt = (loginMethod: string, screenSource: string): void => {
  trackEvent(EVENTS.LOGIN_ATTEMPT, {
    login_method: loginMethod,
    screen_source: screenSource,
  });
};

/**
 * Track successful login
 *
 * @param loginMethod - The method used for successful login ("Google", "Apple", "Email")
 *
 * @example
 * ```typescript
 * trackLoginSuccess("Google");
 * trackLoginSuccess("Email");
 * trackLoginSuccess("Apple");
 * ```
 */
export const trackLoginSuccess = (loginMethod: string): void => {
  trackEvent(EVENTS.LOGIN_SUCCESS, {
    login_method: loginMethod,
  });
};

/**
 * Track login failures
 *
 * @param errorMessage - Optional error message describing the failure
 *
 * @example
 * ```typescript
 * trackLoginFailure("invalid_credentials");
 * trackLoginFailure("google_login_error");
 * trackLoginFailure(); // No specific error message
 * ```
 */
export const trackLoginFailure = (errorMessage?: string): void => {
  trackEvent(EVENTS.LOGIN_FAILURE, {
    error_message: errorMessage,
  });
};

/**
 * Track logout button clicks
 *
 * @example
 * ```typescript
 * trackLogoutButtonClick();
 * ```
 */
export const trackLogoutButtonClick = (): void => {
  trackEvent(EVENTS.LOGOUT_BUTTON_CLICK);
};

// Navigation tracking functions
/**
 * Track get started button clicks
 *
 * @example
 * ```typescript
 * trackGetStartedButtonClick();
 * ```
 */
export const trackGetStartedButtonClick = (): void => {
  trackEvent(EVENTS.GET_STARTED_BUTTON_CLICK);
};

/**
 * Track bottom navigation clicks
 *
 * @param destination - The destination screen ("dashboard", "home", "profile")
 *
 * @example
 * ```typescript
 * trackBottomNavClick("dashboard");
 * trackBottomNavClick("home");
 * trackBottomNavClick("profile");
 * ```
 */
export const trackBottomNavClick = (destination: string): void => {
  trackEvent(EVENTS.BOTTOM_NAV_CLICK, {
    destination,
  });
};

// Interview setup tracking functions
/**
 * Track role selection for interview
 *
 * @param selectedRole - The selected role for the interview
 *
 * @example
 * ```typescript
 * trackRoleSelected("Software Engineer");
 * trackRoleSelected("Data Scientist");
 * ```
 */
export const trackRoleSelected = (selectedRole: string): void => {
  trackEvent(EVENTS.ROLE_SELECTED, {
    selected_role: selectedRole,
  });
};

/**
 * Track difficulty level selection for interview
 *
 * @param difficultyLevel - The selected difficulty level ("easy", "medium", "hard")
 *
 * @example
 * ```typescript
 * trackDifficultySelected("easy");
 * trackDifficultySelected("medium");
 * trackDifficultySelected("hard");
 * ```
 */
export const trackDifficultySelected = (difficultyLevel: string): void => {
  trackEvent(EVENTS.DIFFICULTY_SELECTED, {
    difficulty_level: difficultyLevel,
  });
};

/**
 * Track resume toggle clicks for interview
 *
 * @param toggleState - Whether the resume toggle is on or off
 *
 * @example
 * ```typescript
 * trackResumeToggleClick(true);  // Resume enabled
 * trackResumeToggleClick(false); // Resume disabled
 * ```
 */
export const trackResumeToggleClick = (toggleState: boolean): void => {
  trackEvent(EVENTS.RESUME_TOGGLE_CLICK, {
    toggle_state: toggleState ? "on" : "off",
  });
};

/**
 * Track start interview button clicks
 *
 * @param selectedRole - The selected role for the interview
 * @param difficultyLevel - The selected difficulty level
 * @param useResume - Whether resume is being used
 *
 * @example
 * ```typescript
 * trackStartInterviewButtonClick("Software Engineer", "medium", true);
 * trackStartInterviewButtonClick("Product Manager", "easy", false);
 * ```
 */
export const trackStartInterviewButtonClick = (
  selectedRole: string,
  difficultyLevel: string,
  useResume: boolean
): void => {
  trackEvent(EVENTS.START_INTERVIEW_BUTTON_CLICK, {
    selected_role: selectedRole,
    difficulty_level: difficultyLevel,
    use_resume: useResume,
  });
};

// Interview tracking functions
/**
 * Track interview question views
 *
 * @param questionId - Unique identifier for the question
 * @param questionNumber - The sequential number of the question (1, 2, 3, etc.)
 * @param questionType - The type of question ("technical", "behavioral")
 * @param interviewSessionId - Unique identifier for the interview session
 *
 * @example
 * ```typescript
 * trackInterviewQuestionView("q_001", 1, "technical", "session_123");
 * trackInterviewQuestionView("q_002", 2, "behavioral", "session_123");
 * ```
 */
export const trackInterviewQuestionView = (
  questionId: string,
  questionNumber: number,
  questionType: string,
  interviewSessionId: string
): void => {
  trackEvent(EVENTS.INTERVIEW_QUESTION_VIEW, {
    question_id: questionId,
    question_number: questionNumber,
    question_type: questionType,
    interview_session_id: interviewSessionId,
  });
};

/**
 * Track answer start clicks
 *
 * @example
 * ```typescript
 * trackAnswerStartClick();
 * ```
 */
export const trackAnswerStartClick = (): void => {
  trackEvent(EVENTS.ANSWER_START_CLICK);
};

/**
 * Track when an answer is recorded
 *
 * @param timeToAnswer - Time taken to answer from question view to completion (in seconds)
 *
 * @example
 * ```typescript
 * trackAnswerRecorded(45); // 45 seconds to answer
 * trackAnswerRecorded(120); // 2 minutes to answer
 * ```
 */
export const trackAnswerRecorded = (timeToAnswer: number): void => {
  trackEvent(EVENTS.ANSWER_RECORDED, {
    time_to_answer: timeToAnswer,
  });
};

/**
 * Track redo button clicks
 *
 * @param questionId - The ID of the question being redone
 * @param attemptNumber - The attempt number (1, 2, 3, etc.)
 *
 * @example
 * ```typescript
 * trackRedoButtonClick("q_001", 1); // First redo attempt
 * trackRedoButtonClick("q_001", 2); // Second redo attempt
 * ```
 */
export const trackRedoButtonClick = (questionId: string, attemptNumber: number): void => {
  trackEvent(EVENTS.REDO_BUTTON_CLICK, {
    question_id: questionId,
    attempt_number: attemptNumber,
  });
};

/**
 * Track skip question clicks
 *
 * @example
 * ```typescript
 * trackSkipQuestionClick();
 * ```
 */
export const trackSkipQuestionClick = (): void => {
  trackEvent(EVENTS.SKIP_QUESTION_CLICK);
};

/**
 * Track submit interview clicks (on final question)
 *
 * @example
 * ```typescript
 * trackSubmitInterviewClick();
 * ```
 */
export const trackSubmitInterviewClick = (): void => {
  trackEvent(EVENTS.SUBMIT_INTERVIEW_CLICK);
};

// Interview completion tracking functions
/**
 * Track screen views
 *
 * @param screenName - The name of the screen being viewed
 * @param interviewSessionId - Optional interview session ID for context
 *
 * @example
 * ```typescript
 * trackScreenView("congratulations_page", "session_123");
 * trackScreenView("overall_report_page", "session_123");
 * trackScreenView("dashboard");
 * ```
 */
export const trackScreenView = (screenName: string, interviewSessionId?: string): void => {
  trackEvent(EVENTS.SCREEN_VIEW, {
    screen_name: screenName,
    interview_session_id: interviewSessionId,
  });
};

/**
 * Track report generation start
 *
 * @example
 * ```typescript
 * trackReportGenerationStart();
 * ```
 */
export const trackReportGenerationStart = (): void => {
  trackEvent(EVENTS.REPORT_GENERATION_START);
};

/**
 * Track report generation errors
 *
 * @param errorDetails - Details about the error that occurred
 *
 * @example
 * ```typescript
 * trackReportGenerationError("API timeout");
 * trackReportGenerationError("Insufficient data for analysis");
 * ```
 */
export const trackReportGenerationError = (errorDetails: string): void => {
  trackEvent(EVENTS.REPORT_GENERATION_ERROR, {
    error_details: errorDetails,
  });
};

// Profile tracking functions
/**
 * Track profile edit button clicks
 *
 * @param fieldName - The name of the field being edited
 *
 * @example
 * ```typescript
 * trackProfileEditButtonClick("targetPosition");
 * trackProfileEditButtonClick("degree");
 * trackProfileEditButtonClick("resume");
 * ```
 */
export const trackProfileEditButtonClick = (fieldName: string): void => {
  trackEvent(EVENTS.PROFILE_EDIT_BUTTON_CLICK, {
    field_name: fieldName,
  });
};

/**
 * Track profile field value changes
 *
 * @param fieldName - The name of the field being changed
 * @param newValue - The new value being set
 *
 * @example
 * ```typescript
 * trackProfileFieldValueChanged("targetPosition", "Software Engineer");
 * trackProfileFieldValueChanged("degree", "Bachelor of Technology");
 * ```
 */
export const trackProfileFieldValueChanged = (fieldName: string, newValue: string): void => {
  trackEvent(EVENTS.PROFILE_FIELD_VALUE_CHANGED, {
    field_name: fieldName,
    new_value: newValue,
  });
};

/**
 * Track profile update button clicks
 *
 * @param fieldName - The name of the field being updated
 *
 * @example
 * ```typescript
 * trackProfileUpdateButtonClick("targetPosition");
 * trackProfileUpdateButtonClick("resume");
 * ```
 */
export const trackProfileUpdateButtonClick = (fieldName: string): void => {
  trackEvent(EVENTS.PROFILE_UPDATE_BUTTON_CLICK, {
    field_name: fieldName,
  });
};

/**
 * Track profile help button clicks
 *
 * @example
 * ```typescript
 * trackProfileHelpButtonClick();
 * ```
 */
export const trackProfileHelpButtonClick = (): void => {
  trackEvent(EVENTS.PROFILE_HELP_BUTTON_CLICK);
};

/**
 * Track profile support button clicks
 *
 * @example
 * ```typescript
 * trackProfileSupportButtonClick();
 * ```
 */
export const trackProfileSupportButtonClick = (): void => {
  trackEvent(EVENTS.PROFILE_SUPPORT_BUTTON_CLICK);
};
