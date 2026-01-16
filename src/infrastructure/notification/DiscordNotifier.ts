import axios, { AxiosInstance } from 'axios';
import { Article } from '../../domain/models/Article';
import { MessageFormatter, DiscordMessage } from './MessageFormatter';
import { NotificationError } from '../../shared/errors/CustomErrors';
import { logger } from '../../shared/logger/Logger';

/**
 * Discord通知オプション
 */
export interface NotificationOptions {
  maxRetries: number;
  retryDelayMs: number;
}

/**
 * Discord通知クライアント
 */
export class DiscordNotifier {
  private webhookUrl: string;
  private axiosInstance: AxiosInstance;
  private formatter: MessageFormatter;
  private options: NotificationOptions;

  constructor(webhookUrl: string, options?: Partial<NotificationOptions>) {
    this.webhookUrl = webhookUrl;
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    this.formatter = new MessageFormatter();
    this.options = {
      maxRetries: options?.maxRetries ?? 3,
      retryDelayMs: options?.retryDelayMs ?? 1000,
    };
  }

  /**
   * 記事リストをDiscordに通知（リトライ付き）
   */
  async notifyArticles(articles: Article[], keywords: string[]): Promise<void> {
    if (articles.length === 0) {
      logger.info('No articles to notify');
      await this.sendNoArticlesMessage(keywords);
      return;
    }

    const message = await this.formatter.formatArticles(articles, keywords);
    await this.sendWithRetry(message);

    logger.info(`Successfully notified ${articles.length} articles to Discord`);
  }

  /**
   * エラーをDiscordに通知
   */
  async notifyError(error: Error): Promise<void> {
    try {
      const message = this.formatter.formatError(error);
      await this.sendWithRetry(message);
      logger.info('Successfully notified error to Discord');
    } catch (notifyError) {
      logger.error('Failed to notify error to Discord:', notifyError);
      // エラー通知の失敗は例外を投げない（無限ループ防止）
    }
  }

  /**
   * 記事なしメッセージを送信
   */
  private async sendNoArticlesMessage(keywords: string[]): Promise<void> {
    const message = this.formatter.formatNoArticles(keywords);
    await this.sendWithRetry(message);
    logger.info('Successfully notified no articles message to Discord');
  }

  /**
   * リトライ付きでメッセージを送信
   */
  private async sendWithRetry(message: DiscordMessage): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        logger.info(`Sending message to Discord (attempt ${attempt}/${this.options.maxRetries})`);

        await this.axiosInstance.post(this.webhookUrl, message);

        return; // 成功したら終了
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Discord APIのレート制限エラーを検出
        if (axios.isAxiosError(error) && error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : this.options.retryDelayMs * attempt;
          logger.warn(`Discord rate limit hit. Retrying after ${waitTime}ms`);
          await this.delay(waitTime);
          continue;
        }

        logger.warn(
          `Failed to send message to Discord (attempt ${attempt}/${this.options.maxRetries}): ${lastError.message}`
        );

        // 最後の試行でなければリトライ待機
        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelayMs * attempt); // 指数バックオフ
        }
      }
    }

    // すべての試行が失敗した場合
    throw new NotificationError(
      `Failed to send message to Discord after ${this.options.maxRetries} attempts: ${lastError?.message}`,
      true
    );
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * カスタムメッセージを送信
   */
  async sendCustomMessage(content: string): Promise<void> {
    try {
      await this.axiosInstance.post(this.webhookUrl, { content });
      logger.info('Successfully sent custom message to Discord');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new NotificationError(`Failed to send custom message to Discord: ${errorMessage}`);
    }
  }

  /**
   * 通知オプションを更新
   */
  updateOptions(newOptions: Partial<NotificationOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 現在のオプションを取得
   */
  getOptions(): NotificationOptions {
    return { ...this.options };
  }
}
