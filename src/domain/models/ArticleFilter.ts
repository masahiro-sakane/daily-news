/**
 * フィルターマッチング戦略
 */
export type MatchStrategy = 'OR' | 'AND';

/**
 * フィルターオプション
 */
export interface FilterOptions {
  matchStrategy: MatchStrategy;
  caseSensitive: boolean;
  searchInTitle: boolean;
  searchInDescription: boolean;
  searchInContent?: boolean;
}

/**
 * 記事フィルター条件
 */
export class ArticleFilter {
  private readonly _keywords: string[];
  private readonly _options: FilterOptions;

  constructor(keywords: string[], options?: Partial<FilterOptions>) {
    if (keywords.length === 0) {
      throw new Error('At least one keyword is required for filtering');
    }

    this._keywords = keywords;
    this._options = {
      matchStrategy: options?.matchStrategy || 'OR',
      caseSensitive: options?.caseSensitive || false,
      searchInTitle: options?.searchInTitle ?? true,
      searchInDescription: options?.searchInDescription ?? true,
      searchInContent: options?.searchInContent ?? false,
    };
  }

  get keywords(): string[] {
    return [...this._keywords];
  }

  get options(): FilterOptions {
    return { ...this._options };
  }

  /**
   * キーワードを追加
   */
  addKeywords(newKeywords: string[]): ArticleFilter {
    const mergedKeywords = [...new Set([...this._keywords, ...newKeywords])];
    return new ArticleFilter(mergedKeywords, this._options);
  }

  /**
   * フィルターオプションを更新
   */
  withOptions(newOptions: Partial<FilterOptions>): ArticleFilter {
    return new ArticleFilter(this._keywords, { ...this._options, ...newOptions });
  }

  /**
   * Plain Objectに変換
   */
  toPlainObject(): {
    keywords: string[];
    options: FilterOptions;
  } {
    return {
      keywords: this._keywords,
      options: this._options,
    };
  }

  /**
   * Plain Objectからインスタンスを生成
   */
  static fromPlainObject(obj: {
    keywords: string[];
    options?: Partial<FilterOptions>;
  }): ArticleFilter {
    return new ArticleFilter(obj.keywords, obj.options);
  }
}
