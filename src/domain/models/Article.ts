import crypto from 'crypto';

/**
 * 記事エンティティ
 */
export class Article {
  private readonly _id: string;
  private readonly _title: string;
  private readonly _url: string;
  private readonly _description?: string;
  private readonly _content?: string;
  private readonly _publishedAt: Date;
  private readonly _feedName: string;

  constructor(
    title: string,
    url: string,
    publishedAt: Date,
    feedName: string,
    description?: string,
    content?: string
  ) {
    this._title = title;
    this._url = url;
    this._publishedAt = publishedAt;
    this._feedName = feedName;
    this._description = description;
    this._content = content;
    this._id = this.generateId();
  }

  /**
   * 記事の一意なIDを生成（URL+タイトルのハッシュ）
   */
  private generateId(): string {
    const hash = crypto.createHash('sha256');
    hash.update(this._url + this._title);
    return hash.digest('hex');
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get url(): string {
    return this._url;
  }

  get description(): string | undefined {
    return this._description;
  }

  get content(): string | undefined {
    return this._content;
  }

  get publishedAt(): Date {
    return this._publishedAt;
  }

  get feedName(): string {
    return this._feedName;
  }

  /**
   * キーワードが記事にマッチするかチェック
   */
  matchesKeyword(keyword: string, caseSensitive: boolean = false): boolean {
    const searchText = caseSensitive
      ? `${this._title} ${this._description || ''} ${this._content || ''}`
      : `${this._title} ${this._description || ''} ${this._content || ''}`.toLowerCase();

    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();

    return searchText.includes(searchKeyword);
  }

  /**
   * 記事の簡易表現を取得
   */
  toPlainObject(): {
    id: string;
    title: string;
    url: string;
    description?: string;
    publishedAt: string;
    feedName: string;
  } {
    return {
      id: this._id,
      title: this._title,
      url: this._url,
      description: this._description,
      publishedAt: this._publishedAt.toISOString(),
      feedName: this._feedName,
    };
  }

  /**
   * Plain Objectから記事インスタンスを復元
   */
  static fromPlainObject(obj: {
    id?: string;
    title: string;
    url: string;
    description?: string;
    publishedAt: string;
    feedName: string;
    content?: string;
  }): Article {
    return new Article(
      obj.title,
      obj.url,
      new Date(obj.publishedAt),
      obj.feedName,
      obj.description,
      obj.content
    );
  }
}
