/**
 * フィードタイプ
 */
export type FeedType = 'rss' | 'atom';

/**
 * フィードエンティティ
 */
export class Feed {
  private readonly _name: string;
  private readonly _url: string;
  private readonly _type: FeedType;
  private readonly _enabled: boolean;

  constructor(name: string, url: string, type: FeedType, enabled: boolean = true) {
    this.validateUrl(url);
    this._name = name;
    this._url = url;
    this._type = type;
    this._enabled = enabled;
  }

  private validateUrl(url: string): void {
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid feed URL: ${url}`);
    }
  }

  get name(): string {
    return this._name;
  }

  get url(): string {
    return this._url;
  }

  get type(): FeedType {
    return this._type;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * フィードが有効かチェック
   */
  isEnabled(): boolean {
    return this._enabled;
  }

  /**
   * Plain Objectに変換
   */
  toPlainObject(): {
    name: string;
    url: string;
    type: FeedType;
    enabled: boolean;
  } {
    return {
      name: this._name,
      url: this._url,
      type: this._type,
      enabled: this._enabled,
    };
  }

  /**
   * Plain Objectからインスタンスを生成
   */
  static fromPlainObject(obj: {
    name: string;
    url: string;
    type: FeedType;
    enabled?: boolean;
  }): Feed {
    return new Feed(obj.name, obj.url, obj.type, obj.enabled ?? true);
  }
}
