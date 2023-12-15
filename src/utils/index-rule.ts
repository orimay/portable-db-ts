function numberToSortableString(value: number) {
  if (value === -Infinity) return ','; // Less than any number in string sorting
  if (value === Infinity) return ':'; // Bigger than any number in string sorting
  const strValue =
    value >= 0
      ? value.toString(36) // base-36 numbers are 31.25% shorter than base-10: 11 vs 16
      : // makes negative numbers sorting alphabetically-correct
        '-' + (Number.MAX_SAFE_INTEGER + value).toString(36);
  // Prefix number with zeros for proper string sorting
  return strValue.replace(/(?<=^|-)[0-9a-z]+/, q => q.padStart(11, '0'));
}

export const IndexRule = {
  /**
   * Converts a string value to a sortable representation.
   * @param value The string value to be converted.
   * @returns A string representing the sortable version of the input.
   */
  string: (value: string | null) => value ?? '\x00',
  /**
   * Converts a number value to a sortable representation.
   * @param value The number value to be converted.
   * @returns A string representing the sortable version of the input.
   */
  number: (value: number | null) =>
    value === null ? '\x00' : numberToSortableString(value),
  /**
   * Converts a boolean value to a sortable representation.
   * @param value The boolean value to be converted.
   * @returns A string representing the sortable version of the input.
   */
  boolean: (value: boolean | null) => value === null ? '\x00' : `${+value}`,
  /**
   * Converts a string containing numbers to a sortable representation.
   * It handles both pure strings and strings containing numeric values.
   * @param value The string value to be converted.
   * @returns A string representing the sortable version of the input.
   */
  stringNum: (value: string | null) =>
    value === null
      ? '\x00'
      : IndexRule.string(
          value.replaceAll(/(?<!\.[0-9]*)-?[0-9]+(?:\.[0-9]+)?/g, v =>
            IndexRule.number(+v),
          ),
        ),
  /**
   * Converts an object to a sortable JSON string.
   * It recursively applies the appropriate conversion for each type within the object.
   * @param value The object value to be converted.
   * @returns A string representing the sortable version of the input.
   */
  object: (value: Record<string, unknown> | null): string => {
    return value === null
      ? '\x00'
      : JSON.stringify(value, (_k, v) => {
          switch (typeof v) {
            case 'string':
              return IndexRule.string(v);
            case 'number':
              return IndexRule.number(v);
            case 'boolean':
              return IndexRule.boolean(v);
          }
          return IndexRule.object(v);
        });
  },
};
