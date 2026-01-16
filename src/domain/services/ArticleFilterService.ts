import { Article } from '../models/Article';
import { ArticleFilter } from '../models/ArticleFilter';

/**
 * 記事フィルタリングドメインサービス
 */
export class ArticleFilterService {
  /**
   * フィルター条件に基づいて記事をフィルタリング
   */
  filterArticles(articles: Article[], filter: ArticleFilter): Article[] {
    return articles.filter((article) => this.matchesFilter(article, filter));
  }

  /**
   * 記事がフィルター条件にマッチするかチェック
   */
  private matchesFilter(article: Article, filter: ArticleFilter): boolean {
    const { keywords, options } = filter.toPlainObject();
    const { matchStrategy, caseSensitive } = options;

    // 検索対象テキストの構築
    const searchableText = this.buildSearchableText(article, options);

    // キーワードマッチングの実行
    const matches = keywords.map((keyword) =>
      this.matchKeyword(searchableText, keyword, caseSensitive)
    );

    // マッチング戦略に応じた結果判定
    if (matchStrategy === 'OR') {
      // いずれかのキーワードにマッチ
      return matches.some((match) => match);
    } else {
      // すべてのキーワードにマッチ
      return matches.every((match) => match);
    }
  }

  /**
   * 検索対象テキストを構築
   */
  private buildSearchableText(
    article: Article,
    options: {
      searchInTitle: boolean;
      searchInDescription: boolean;
      searchInContent?: boolean;
    }
  ): string {
    const parts: string[] = [];

    if (options.searchInTitle) {
      parts.push(article.title);
    }

    if (options.searchInDescription && article.description) {
      parts.push(article.description);
    }

    if (options.searchInContent && article.content) {
      parts.push(article.content);
    }

    return parts.join(' ');
  }

  /**
   * キーワードマッチング
   */
  private matchKeyword(text: string, keyword: string, caseSensitive: boolean): boolean {
    const searchText = caseSensitive ? text : text.toLowerCase();
    const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();

    return searchText.includes(searchKeyword);
  }

  /**
   * 記事リストから既読記事を除外
   */
  excludeReadArticles(articles: Article[], readArticleIds: Set<string>): Article[] {
    return articles.filter((article) => !readArticleIds.has(article.id));
  }

  /**
   * 記事を公開日時の降順でソート
   */
  sortByPublishedDate(articles: Article[]): Article[] {
    return articles.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  }

  /**
   * 記事を最大件数に制限
   */
  limitArticles(articles: Article[], maxCount: number): Article[] {
    return articles.slice(0, maxCount);
  }
}
