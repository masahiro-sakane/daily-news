import { Feed } from '../../domain/models/Feed';
import { Article } from '../../domain/models/Article';
import { RssFeedParser } from './RssFeedParser';
import { FeedFetchError } from '../../shared/errors/CustomErrors';
import { logger } from '../../shared/logger/Logger';

/**
 * フィード取得オプション
 */
export interface FetchOptions {
  maxRetries: number;
  retryDelayMs: number;
  timeout: number;
}

/**
 * フィード取得クライアント
 */
export class FeedClient {
  private parser: RssFeedParser;
  private options: FetchOptions;

  constructor(options?: Partial<FetchOptions>) {
    this.parser = new RssFeedParser();
    this.options = {
      maxRetries: options?.maxRetries ?? 3,
      retryDelayMs: options?.retryDelayMs ?? 1000,
      timeout: options?.timeout ?? 10000,
    };
  }

  /**
   * 単一のフィードを取得（リトライ付き）
   */
  async fetchFeed(feed: Feed): Promise<Article[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        logger.info(
          `Fetching feed: ${feed.name} (attempt ${attempt}/${this.options.maxRetries})`
        );

        const articles = await this.parser.parse(feed);
        return articles;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `Failed to fetch feed ${feed.name} (attempt ${attempt}/${this.options.maxRetries}): ${lastError.message}`
        );

        // 最後の試行でなければリトライ待機
        if (attempt < this.options.maxRetries) {
          await this.delay(this.options.retryDelayMs * attempt); // 指数バックオフ
        }
      }
    }

    // すべての試行が失敗した場合
    throw new FeedFetchError(
      `Failed to fetch feed ${feed.name} after ${this.options.maxRetries} attempts: ${lastError?.message}`,
      feed.url
    );
  }

  /**
   * 複数のフィードを並行して取得
   */
  async fetchFeeds(feeds: Feed[]): Promise<Article[]> {
    logger.info(`Fetching ${feeds.length} feeds in parallel`);

    // 並行処理で取得
    const fetchPromises = feeds.map(async (feed) => {
      try {
        return await this.fetchFeed(feed);
      } catch (error) {
        logger.error(`Failed to fetch feed ${feed.name}:`, error);
        // エラーが発生しても他のフィードの取得を続行
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);

    // すべての記事を結合
    const allArticles = results.flat();

    logger.info(`Fetched total ${allArticles.length} articles from ${feeds.length} feeds`);
    return allArticles;
  }

  /**
   * 有効なフィードのみを取得
   */
  async fetchEnabledFeeds(feeds: Feed[]): Promise<Article[]> {
    const enabledFeeds = feeds.filter((feed) => feed.isEnabled());
    logger.info(`Found ${enabledFeeds.length} enabled feeds out of ${feeds.length} total`);
    return this.fetchFeeds(enabledFeeds);
  }

  /**
   * 指定時間待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * フィード取得オプションを更新
   */
  updateOptions(newOptions: Partial<FetchOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * 現在のオプションを取得
   */
  getOptions(): FetchOptions {
    return { ...this.options };
  }
}
