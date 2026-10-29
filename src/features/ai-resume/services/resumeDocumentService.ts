import axios from "axios";
import { productSession } from "@/lib/session-runtime";
import { createSessionAxios } from "@/lib/session-axios";
import { assertAuthRevision, getAuthRevision } from "@/lib/auth-session";

const pdfOwners = new WeakMap<Blob, number>();
import { ENDPOINTS } from "@/lib/api-config/src/endpoints";
import { getTokenFromCookies } from "@/lib/token-utils";

/** Download and profile save must use the same server-generated, paginated PDF. */
export async function getResumePdf(
  resumeId: string,
  ownerRevision = getAuthRevision()
): Promise<Blob> {
  assertAuthRevision(ownerRevision);
  const session = productSession();
  const token = session ? null : getTokenFromCookies();
  if (!session && !token) throw new Error("Sign in again before saving your resume.");
  const response = session
    ? await createSessionAxios(process.env.NEXT_PUBLIC_API_BASE_URL || "", session).get<Blob>(
        ENDPOINTS.RESUME_BUILDER.GET_DOWNLOAD(resumeId),
        { responseType: "blob" }
      )
    : await axios.get<Blob>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.RESUME_BUILDER.GET_DOWNLOAD(resumeId)}`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
  assertAuthRevision(ownerRevision);
  const blob = response.data;
  if (!(blob instanceof Blob) || !blob.size || blob.type.split(";")[0] !== "application/pdf") {
    throw new Error("The server did not return a PDF. Please try again.");
  }
  pdfOwners.set(blob, ownerRevision);
  return blob;
}

export async function saveResumePdfToProfile(
  pdf: Blob,
  ownerRevision = pdfOwners.get(pdf) ?? getAuthRevision()
): Promise<void> {
  const originalOwner = pdfOwners.get(pdf);
  if (originalOwner !== undefined) assertAuthRevision(originalOwner);
  assertAuthRevision(ownerRevision);
  const session = productSession();
  const token = session ? null : getTokenFromCookies();
  if (!session && !token) throw new Error("Sign in again before saving your resume.");
  const form = new FormData();
  form.append("file", new File([pdf], "my_resume.pdf", { type: "application/pdf" }));
  if (session) {
    await createSessionAxios(process.env.NEXT_PUBLIC_API_BASE_URL || "", session).post(
      ENDPOINTS.RESUME.SAVE_FINAL,
      form
    );
    assertAuthRevision(ownerRevision);
    return;
  }
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/${ENDPOINTS.RESUME.SAVE_FINAL}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  );
  assertAuthRevision(ownerRevision);
  if (!response.ok) throw new Error("Could not save the resume to your profile. Please try again.");
}
