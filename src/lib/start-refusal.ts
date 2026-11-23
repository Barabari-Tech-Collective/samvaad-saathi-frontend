/** Each refusal says what happened and the one thing that will help; retrying a limit never does. */
export function startRefusalMessage(status: number): string {
  switch (status) {
    case 401:
      return "Your sign-in has expired. Sign in again, then start the interview.";
    case 403:
      return "This interview isn't open to you yet. Ask your teacher if you expected to see it.";
    case 404:
    case 410:
      return "This interview is no longer available. Pick another one from the list.";
    case 429:
      return "You've started a lot of interviews in the last hour. Wait a while before starting another.";
    default:
      return "Some of your choices are no longer valid. Check them and try again.";
  }
}
