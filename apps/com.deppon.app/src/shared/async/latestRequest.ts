export interface LatestRequestToken {
  id: number
  key: string
}

export interface LatestRequestOptions {
  force?: boolean
}

export class LatestRequestCoordinator {
  private nextId = 0
  private latestTokenId = 0
  private readonly pendingTokens = new Map<string, LatestRequestToken>()

  begin(
    key: string,
    options: LatestRequestOptions = {}
  ): LatestRequestToken | null {
    const pendingToken = this.pendingTokens.get(key)

    if (pendingToken && !options.force) {
      this.latestTokenId = pendingToken.id
      return null
    }

    const token = {
      id: ++this.nextId,
      key
    }

    this.pendingTokens.set(key, token)
    this.latestTokenId = token.id
    return token
  }

  isLatest(token: LatestRequestToken) {
    return token.id === this.latestTokenId
  }

  invalidate() {
    this.latestTokenId = ++this.nextId
    this.pendingTokens.clear()
  }

  finish(token: LatestRequestToken) {
    if (this.pendingTokens.get(token.key) === token) {
      this.pendingTokens.delete(token.key)
    }

    return this.isLatest(token)
  }
}
