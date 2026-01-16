import { Article } from '../models/Article';

/**
 * 記事リポジトリのインターフェース（DIP原則）
 */
export interface IArticleRepository {
  /**
   * 既読記事のIDリストを取得
   */
  findReadArticleIds(): Promise<string[]>;

  /**
   * 記事が既読かチェック
   */
  isArticleRead(articleId: string): Promise<boolean>;

  /**
   * 既読記事として保存
   */
  saveReadArticle(article: Article): Promise<void>;

  /**
   * 複数の記事を既読として保存
   */
  saveReadArticles(articles: Article[]): Promise<void>;

  /**
   * 古い既読記事を削除（データ保持期間を超えたもの）
   */
  cleanupOldArticles(retentionDays: number): Promise<void>;
}
