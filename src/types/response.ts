export type TResponse = { id: string } & (
  | {
      error: { name: string; message: string; stack?: string };
    }
  | {
      value: unknown;
    }
  | {
      yield: unknown;
    }
  | {
      log: unknown[];
    }
);
