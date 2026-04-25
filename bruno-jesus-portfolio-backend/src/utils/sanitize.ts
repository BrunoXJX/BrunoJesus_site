const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const STYLE_PATTERN = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const CONTROL_CHARS_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

function removeUnsafeMarkup(value: string): string {
  return value
    .replace(CONTROL_CHARS_PATTERN, "")
    .replace(SCRIPT_PATTERN, " ")
    .replace(STYLE_PATTERN, " ")
    .replace(HTML_TAG_PATTERN, " ");
}

export function sanitizeSingleLine(value: string): string {
  return removeUnsafeMarkup(value)
    .replace(/\s+/g, " ")
    .trim();
}

export function sanitizeMultiline(value: string): string {
  return removeUnsafeMarkup(value)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
