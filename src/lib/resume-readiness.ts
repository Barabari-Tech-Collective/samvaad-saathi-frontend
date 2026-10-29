/** The extraction receipt describes this upload; /me.hasResume may describe an older one. */
export function assertResumeDataSaved(value: unknown): void {
  if (!value || typeof value !== "object") {
    throw new Error(
      "Resume saving could not be confirmed. Your file is still selected. Check your Profile before uploading again."
    );
  }
  const receipt = value as Record<string, unknown>;
  if (receipt.saved === false) {
    throw new Error(
      "Your resume data could not be saved. Your file is still selected; please try again."
    );
  }
  if (
    receipt.saved !== true ||
    typeof receipt.textLength !== "number" ||
    !Number.isSafeInteger(receipt.textLength)
  ) {
    throw new Error(
      "Resume saving could not be confirmed. Your file is still selected. Check your Profile before uploading again."
    );
  }
  if (receipt.textLength <= 0) {
    throw new Error(
      "No readable text was found in this resume. Choose a text-based PDF instead of a scanned image."
    );
  }
}
