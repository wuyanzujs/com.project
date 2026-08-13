export type LatestRequestRunner = <TResult>(
  key: string,
  request: () => Promise<TResult>,
  handleLatest: (result: TResult) => unknown | Promise<unknown>,
  options?: { force?: boolean }
) => Promise<boolean>

export const INVOICE_PAGE_SIZE = 10
