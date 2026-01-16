import * as fs from 'fs/promises';
import * as path from 'path';
import { Article } from '../../domain/models/Article';
import { StorageError } from '../../shared/errors/CustomErrors';
import { logger } from '../../shared/logger/Logger';

/**
 * 記事ストレージのデータ構造
 */
interface StorageData {
  articles: Array<{
    id: string;
    title: string;
    url: string;
    description?: string;
    publishedAt: string;
    feedName: string;
  }>;
}

/**
 * 記事をJSONファイルに保存するストレージクラス
 */
export class ArticleStorage {
  private storagePath: string;

  constructor(storagePath: string) {
    this.storagePath = storagePath;
  }

  /**
   * すべての記事を読み込む
   */
  async loadArticles(): Promise<Article[]> {
    try {
      const absolutePath = this.getAbsolutePath();

      // ファイルが存在しない場合は空の配列を返す
      try {
        await fs.access(absolutePath);
      } catch {
        logger.info(`Storage file not found, returning empty array: ${absolutePath}`);
        return [];
      }

      const fileContent = await fs.readFile(absolutePath, 'utf-8');
      const data: StorageData = JSON.parse(fileContent);

      if (!data.articles || !Array.isArray(data.articles)) {
        logger.warn(`Invalid storage data format, returning empty array`);
        return [];
      }

      const articles = data.articles.map((item) => Article.fromPlainObject(item));
      logger.info(`Loaded ${articles.length} articles from storage`);
      return articles;
    } catch (error) {
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to load articles from storage: ${error.message}`,
          this.storagePath
        );
      }
      throw new StorageError('Failed to load articles from storage', this.storagePath);
    }
  }

  /**
   * 記事を保存
   */
  async saveArticles(articles: Article[]): Promise<void> {
    try {
      const absolutePath = this.getAbsolutePath();

      // ディレクトリが存在しない場合は作成
      const dirPath = path.dirname(absolutePath);
      await fs.mkdir(dirPath, { recursive: true });

      // データを準備
      const data: StorageData = {
        articles: articles.map((article) => article.toPlainObject()),
      };

      // JSONファイルに書き込み
      await fs.writeFile(absolutePath, JSON.stringify(data, null, 2), 'utf-8');

      logger.info(`Saved ${articles.length} articles to storage: ${absolutePath}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to save articles to storage: ${error.message}`,
          this.storagePath
        );
      }
      throw new StorageError('Failed to save articles to storage', this.storagePath);
    }
  }

  /**
   * 記事を追加（既存の記事とマージ）
   */
  async appendArticles(newArticles: Article[]): Promise<void> {
    try {
      const existingArticles = await this.loadArticles();

      // 既存のIDセットを作成
      const existingIds = new Set(existingArticles.map((a) => a.id));

      // 重複を除外して追加
      const articlesToAdd = newArticles.filter((article) => !existingIds.has(article.id));

      if (articlesToAdd.length === 0) {
        logger.info(`No new articles to append`);
        return;
      }

      // マージして保存
      const allArticles = [...existingArticles, ...articlesToAdd];
      await this.saveArticles(allArticles);

      logger.info(`Appended ${articlesToAdd.length} new articles to storage`);
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to append articles to storage: ${error.message}`,
          this.storagePath
        );
      }
      throw new StorageError('Failed to append articles to storage', this.storagePath);
    }
  }

  /**
   * 古い記事を削除
   */
  async cleanupOldArticles(retentionDays: number): Promise<void> {
    try {
      const articles = await this.loadArticles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const remainingArticles = articles.filter(
        (article) => article.publishedAt >= cutoffDate
      );

      const removedCount = articles.length - remainingArticles.length;

      if (removedCount > 0) {
        await this.saveArticles(remainingArticles);
        logger.info(
          `Cleaned up ${removedCount} old articles (retention: ${retentionDays} days)`
        );
      } else {
        logger.info(`No old articles to clean up`);
      }
    } catch (error) {
      if (error instanceof StorageError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new StorageError(
          `Failed to cleanup old articles: ${error.message}`,
          this.storagePath
        );
      }
      throw new StorageError('Failed to cleanup old articles', this.storagePath);
    }
  }

  /**
   * ストレージパスを取得
   */
  getStoragePath(): string {
    return this.storagePath;
  }

  /**
   * 絶対パスを取得
   */
  private getAbsolutePath(): string {
    return path.isAbsolute(this.storagePath)
      ? this.storagePath
      : path.resolve(process.cwd(), this.storagePath);
  }
}
