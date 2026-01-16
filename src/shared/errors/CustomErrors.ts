/**
 * カスタムエラーの基底クラス
 */
export class BaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * フィードパースエラー
 */
export class FeedParseError extends BaseError {
  constructor(message: string, public feedUrl?: string) {
    super(message);
  }
}

/**
 * 通知エラー
 */
export class NotificationError extends BaseError {
  constructor(message: string, public retryable: boolean = true) {
    super(message);
  }
}

/**
 * ストレージエラー
 */
export class StorageError extends BaseError {
  constructor(message: string, public filePath?: string) {
    super(message);
  }
}

/**
 * 設定エラー
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, public configKey?: string) {
    super(message);
  }
}

/**
 * フィード取得エラー
 */
export class FeedFetchError extends BaseError {
  constructor(message: string, public feedUrl?: string, public statusCode?: number) {
    super(message);
  }
}
