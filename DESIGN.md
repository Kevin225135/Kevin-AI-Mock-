# AI Mock Mentor Design System

## Product character

AI Mock should feel like a calm, rigorous mentor: warm enough to reduce interview
anxiety, serious enough to earn trust, and quiet enough to keep attention on the
candidate's answer.

Brand attributes: reassuring, thoughtful, credible, focused.

## Visual direction

- Warm parchment canvas instead of cool gray or purple.
- Deep forest green is the primary action and navigation color.
- Clay/coral is reserved for emphasis, guidance and human warmth.
- Surfaces use warm ivory, subtle brown-tinted borders and soft elevation.
- Avoid glassmorphism, neon gradients, excessive card nesting and decorative
  motion.

## Core tokens

- Canvas: `#f4efe5`
- Surface: `#fffaf0`
- Ink: `#25342e`
- Primary: `#284f42`
- Primary hover: `#356555`
- Accent clay: `#d56a4b`
- Muted surface: `#efe6d6`
- Border: `#d9cbb8`

All implementation must use semantic CSS/Tailwind tokens where available. Do
not introduce new hard-coded purple or blue brand colors.

## Typography

- UI and body: Plus Jakarta Sans with system fallbacks.
- Editorial moments and interview questions: Newsreader with Songti/Georgia
  fallbacks.
- Use the serif face selectively; forms, metrics, labels and navigation remain
  sans-serif.
- Body copy must remain at least 16px in long-answer areas.

## Shape and spacing

- Buttons: 12px radius.
- Product cards: 20px radius.
- Hero and feature surfaces: up to 26px radius.
- Pills are reserved for statuses, filters and compact metadata.
- Avoid nesting more than two bordered surfaces.

## Motion

- Motion should communicate progress, response or hierarchy.
- Prefer opacity and transform transitions between 180–400ms.
- No bounce or elastic easing.
- Respect `prefers-reduced-motion`.

## Product states

Every async action needs a visible loading label, disabled control and recovery
message. Empty, error and degraded-AI states must not rely on color alone.

## Accessibility

- Maintain WCAG AA text contrast.
- Preserve visible keyboard focus.
- Interactive targets should be at least 40px on touch layouts.
- Scores require text labels in addition to charts and color.
- Long Chinese and English strings must wrap without covering metrics.
