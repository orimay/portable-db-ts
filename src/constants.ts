export const SEPARATOR = String.fromCharCode(3); // End of text
export const AFTER_SEPARATOR = String.fromCharCode(SEPARATOR.charCodeAt(0) + 1);
export const STRIP_LAST_SEPARATOR = new RegExp(`${SEPARATOR}[^${SEPARATOR}]*$`);
export const IN_ARRAY_PERSISTANCE_MARKER = String.fromCharCode(6);
