export function order(a: string, b: string, sort: 1 | -1) {
  return a > b ? sort : a < b ? -sort : 0;
}

export function max<A extends string | undefined, B extends string | undefined>(
  a: A,
  b: B,
): A extends string ? A : B extends string ? B : undefined {
  return (
    b === undefined || a !== undefined && (a as string) > (b as string)
      ? a
      : b
  ) as A extends string ? A : B extends string ? B : undefined;
}

export function min<A extends string | undefined, B extends string | undefined>(
  a: A,
  b: B,
): A extends string ? A : B extends string ? B : undefined {
  return (
    b === undefined || a !== undefined && (a as string) < (b as string)
      ? a
      : b
  ) as A extends string ? A : B extends string ? B : undefined;
}
