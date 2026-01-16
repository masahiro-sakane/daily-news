import { IArticleRepository } from '../../domain/repositories/IArticleRepository';
import { DiscordNotifier } from '../../infrastructure/notification/DiscordNotifier';
import { ArticleDTO } from '../dto/ArticleDTO';
import { logger } from '../../shared/logger/Logger';

/**
 * 記事通知ユースケースの入力
 */
export interface NotifyArticlesInput {
  articles: ArticleDTO[];
  keywords: string[];
  skipNotifyIfEmpty?: boolean;
}

/**
 * 記事通知ユースケースの出力
 */
export interface NotifyArticlesOutput {
  notified: boolean;
  articleCount: number;
  savedToRepository: boolean;
}

/**
 * 記事通知ユースケース
 *
 * 責任:
 * - 記事をDiscordに通知
 * - 通知した記事を既読として保存
 * - 古い既読記事のクリーンアップ
 */
export class NotifyArticlesUseCase {
  constructor(
    private readonly discordNotifier: DiscordNotifier,
    private readonly articleRepository: IArticleRepository,
    private readonly retentionDays: number
  ) {}

  /**
   * 記事を通知して既読保存
   */
  async execute(input: NotifyArticlesInput): Promise<NotifyArticlesOutput> {
    logger.info('Starting NotifyArticlesUseCase');

    const { articles, keywords, skipNotifyIfEmpty = false } = input;

    // 1. 記事がない場合の処理
    if (articles.length === 0) {
      logger.info('No articles to notify');

      if (skipNotifyIfEmpty) {
        logger.info('Skipping notification for empty articles');
        return {
          notified: false,
          articleCount: 0,
          savedToRepository: false,
        };
      }

      // 記事なしメッセージを通知
      await this.discordNotifier.notifyArticles([], keywords);
      return {
        notified: true,
        articleCount: 0,
        savedToRepository: false,
      };
    }

    // 2. 記事をドメインモデルに変換
    const domainArticles = articles.map((dto) => dto.toDomain());

    try {
      // 3. Discordに通知
      await this.discordNotifier.notifyArticles(domainArticles, keywords);
      logger.info(`Notified ${articles.length} articles to Discord`);

      // 4. 既読記事として保存
      await this.articleRepository.saveReadArticles(domainArticles);
      logger.info(`Saved ${articles.length} articles as read`);

      // 5. 古い記事をクリーンアップ
      await this.cleanupOldArticles();

      logger.info('NotifyArticlesUseCase completed successfully');

      return {
        notified: true,
        articleCount: articles.length,
        savedToRepository: true,
      };
    } catch (error) {
      logger.error('Failed to notify articles:', error);

      // エラーをDiscordに通知（オプション）
      if (error instanceof Error) {
        try {
          await this.discordNotifier.notifyError(error);
        } catch (notifyError) {
          logger.error('Failed to notify error to Discord:', notifyError);
        }
      }

      throw error;
    }
  }

  /**
   * 古い既読記事をクリーンアップ
   */
  private async cleanupOldArticles(): Promise<void> {
    try {
      await this.articleRepository.cleanupOldArticles(this.retentionDays);
      logger.info(`Cleaned up old articles (retention: ${this.retentionDays} days)`);
    } catch (error) {
      logger.warn('Failed to cleanup old articles (non-critical):', error);
      // クリーンアップの失敗は致命的ではないのでログのみ
    }
  }

  /**
   * エラーを通知
   */
  async notifyError(error: Error): Promise<void> {
    try {
      await this.discordNotifier.notifyError(error);
      logger.info('Notified error to Discord');
    } catch (notifyError) {
      logger.error('Failed to notify error to Discord:', notifyError);
      throw notifyError;
    }
  }
}
