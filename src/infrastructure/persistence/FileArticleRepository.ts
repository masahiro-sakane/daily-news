import { IArticleRepository } from '../../domain/repositories/IArticleRepository';
import { Article } from '../../domain/models/Article';
import { ArticleStorage } from './ArticleStorage';
import { logger } from '../../shared/logger/Logger';

/**
 * ファイルベースの記事リポジトリ実装
 */
export class FileArticleRepository implements IArticleRepository {
  private storage: ArticleStorage;

  constructor(storagePath: string) {
    this.storage = new ArticleStorage(storagePath);
  }

  /**
   * 既読記事のIDリストを取得
   */
  async findReadArticleIds(): Promise<string[]> {
    try {
      const articles = await this.storage.loadArticles();
      const ids = articles.map((article) => article.id);
      logger.debug(`Found ${ids.length} read article IDs`);
      return ids;
    } catch (error) {
      logger.error(`Failed to find read article IDs:`, error);
      throw error;
    }
  }

  /**
   * 記事が既読かチェック
   */
  async isArticleRead(articleId: string): Promise<boolean> {
    try {
      const readIds = await this.findReadArticleIds();
      const isRead = readIds.includes(articleId);
      logger.debug(`Article ${articleId} is ${isRead ? 'read' : 'unread'}`);
      return isRead;
    } catch (error) {
      logger.error(`Failed to check if article is read:`, error);
      throw error;
    }
  }

  /**
   * 既読記事として保存
   */
  async saveReadArticle(article: Article): Promise<void> {
    try {
      await this.storage.appendArticles([article]);
      logger.debug(`Saved article as read: ${article.id}`);
    } catch (error) {
      logger.error(`Failed to save read article:`, error);
      throw error;
    }
  }

  /**
   * 複数の記事を既読として保存
   */
  async saveReadArticles(articles: Article[]): Promise<void> {
    try {
      if (articles.length === 0) {
        logger.debug(`No articles to save`);
        return;
      }

      await this.storage.appendArticles(articles);
      logger.info(`Saved ${articles.length} articles as read`);
    } catch (error) {
      logger.error(`Failed to save read articles:`, error);
      throw error;
    }
  }

  /**
   * 古い既読記事を削除（データ保持期間を超えたもの）
   */
  async cleanupOldArticles(retentionDays: number): Promise<void> {
    try {
      await this.storage.cleanupOldArticles(retentionDays);
      logger.info(`Cleaned up old articles (retention: ${retentionDays} days)`);
    } catch (error) {
      logger.error(`Failed to cleanup old articles:`, error);
      throw error;
    }
  }
}
