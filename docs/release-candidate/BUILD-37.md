# Build 37 — responsive workspaces and accessibility

21 October 2026. Candidate code; production has not been deployed.

Students now have a responsive workspace shell, task-based Home, clear practice/assessment/human-interview entry points and a two-column profile editor that reflows on small screens. Desktop navigation becomes phone navigation at smaller widths; immersive interviews retain their dedicated canvas. Route changes set page titles and move focus to the main landmark. Profile edit/cancel/save controls restore useful focus and expose named inputs and errors.

Staff share a responsive workspace shell with permission-filtered task groups, route context and skip navigation. Personal-access search preserves hidden selections. Member actions use keyboard-operable menus with deliberate menu-to-dialog focus handoff and return. Form controls and scroll regions have visible focus and usable target sizes. Course-task links wrap with explicit spacing.

Thirteen chart views expose paginated exact-value tables; ten additional raw table surfaces have focusable horizontal scroll regions. Null/nonfinite chart values display as missing rather than zero. Shared controls, constrained modal height, safe-area spacing, reduced motion and forced-color treatment support the responsive layout. Existing backend scope and personal-permission rules remain authoritative.

## Verification

- Student: 259 unit tests; 124 full browser cases; 24 cross-browser accessibility/keyboard cases.
- Dashboard: 37 Node tests; 67 full browser cases; 72 cross-browser accessibility/keyboard cases.
- Chromium, Firefox and WebKit on this Mac; widths 320/768/1440, doubled text, selected task surfaces, skip navigation, modal focus and feature-filter selection preservation.
- Production builds and TypeScript checks passed in both frontends. Student release lint has four pre-existing warnings and no errors; changed dashboard files have no Biome errors.
- Production dependency audits: student has low/moderate findings only; dashboard zero vulnerabilities after a compatible follow-redirects patch.
- Read-only synthetic fixture API data, not production student records or authenticated production acceptance. Reproducible command: npm run test:a11y. Both CI workflows now install three browser engines and run it.

Automated scans do not establish full WCAG conformance. Native VoiceOver acceptance remains pending at the user's request after native Chrome access was refused. Physical mobile acceptance remains pending because no device is available. Visual inspection at 390/1440 found and corrected merged course task links; captures are in the planning verification/build37 folder. Remaining live-provider/device/load and final design review gates stay open.
