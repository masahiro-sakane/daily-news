import { Config } from '../../infrastructure/config/Config';
import { FeedConfig } from '../../infrastructure/config/FeedConfig';
import { FeedClient } from '../../infrastructure/feed/FeedClient';
import { FileArticleRepository } from '../../infrastructure/persistence/FileArticleRepository';
import { DiscordNotifier } from '../../infrastructure/notification/DiscordNotifier';
import { ArticleFilterService } from '../../domain/services/ArticleFilterService';
import { FetchArticlesUseCase } from '../../application/usecases/FetchArticlesUseCase';
import { NotifyArticlesUseCase } from '../../application/usecases/NotifyArticlesUseCase';
import { logger } from '../../shared/logger/Logger';

/**
 * コマンドライン引数
 */
export interface CommandOptions {
  keywords?: string[];
  skipNotifyIfEmpty?: boolean;
  maxArticles?: number;
}

/**
 * Daily Newsコマンド実行クラス
 */
export class DailyNewsCommand {
  private config: Config;
  private feedConfig: FeedConfig;
  private feedClient: FeedClient;
  private articleRepository: FileArticleRepository;
  private discordNotifier: DiscordNotifier;
  private filterService: ArticleFilterService;

  constructor() {
    // 設定を読み込み
    this.config = Config.getInstance();

    // 依存関係を初期化
    this.feedConfig = new FeedConfig();
    this.feedClient = new FeedClient({
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
      timeout: this.config.fetchTimeoutMs,
    });
    this.articleRepository = new FileArticleRepository(this.config.storagePath);
    this.discordNotifier = new DiscordNotifier(this.config.discordWebhookUrl, {
      maxRetries: this.config.maxRetries,
      retryDelayMs: this.config.retryDelayMs,
    });
    this.filterService = new ArticleFilterService();
  }

  /**
   * コマンドを実行
   */
  async execute(options: CommandOptions = {}): Promise<void> {
    try {
      logger.info('=== Daily News Command Started ===');
      logger.info(`Environment: ${this.config.nodeEnv}`);

      // 1. フィード設定を読み込み
      await this.feedConfig.load(this.config.feedConfigPath);

      // 2. キーワードをマージ（デフォルト + カスタム）
      const keywords = this.mergeKeywords(
        this.feedConfig.getKeywords(),
        options.keywords || []
      );

      logger.info(`Using keywords: ${keywords.join(', ')}`);

      // 3. 記事を取得
      const fetchUseCase = new FetchArticlesUseCase(
        this.feedClient,
        this.articleRepository,
        this.filterService
      );

      const fetchResult = await fetchUseCase.execute({
        feeds: this.feedConfig.getAllFeeds(),
        keywords,
        maxArticles: options.maxArticles,
      });

      logger.info(
        `Fetch result: ${fetchResult.totalFetched} fetched, ${fetchResult.totalFiltered} filtered, ${fetchResult.newArticles} new`
      );

      // 4. 記事を通知
      const notifyUseCase = new NotifyArticlesUseCase(
        this.discordNotifier,
        this.articleRepository,
        this.config.retentionDays
      );

      const notifyResult = await notifyUseCase.execute({
        articles: fetchResult.articles,
        keywords,
        skipNotifyIfEmpty: options.skipNotifyIfEmpty || false,
      });

      logger.info(
        `Notify result: notified=${notifyResult.notified}, count=${notifyResult.articleCount}`
      );

      // 5. 結果をログ出力
      this.logSummary(fetchResult, notifyResult);

      logger.info('=== Daily News Command Completed Successfully ===');
    } catch (error) {
      logger.error('Daily News Command failed:', error);

      // エラーをSlackに通知
      if (error instanceof Error) {
        try {
          await this.discordNotifier.notifyError(error);
        } catch (notifyError) {
          logger.error('Failed to notify error to Slack:', notifyError);
        }
      }

      throw error;
    }
  }

  /**
   * キーワードをマージ（デフォルト + カスタム、重複排除）
   */
  private mergeKeywords(defaultKeywords: string[], customKeywords: string[]): string[] {
    const merged = [...new Set([...defaultKeywords, ...customKeywords])];
    return merged.filter((k) => k.length > 0);
  }

  /**
   * 実行結果のサマリーをログ出力
   */
  private logSummary(
    fetchResult: { totalFetched: number; totalFiltered: number; newArticles: number },
    notifyResult: { notified: boolean; articleCount: number; savedToRepository: boolean }
  ): void {
    logger.info('--- Summary ---');
    logger.info(`Total articles fetched: ${fetchResult.totalFetched}`);
    logger.info(`Articles after filtering: ${fetchResult.totalFiltered}`);
    logger.info(`New articles: ${fetchResult.newArticles}`);
    logger.info(`Notified to Slack: ${notifyResult.notified}`);
    logger.info(`Articles notified: ${notifyResult.articleCount}`);
    logger.info(`Saved to repository: ${notifyResult.savedToRepository}`);
    logger.info('---------------');
  }

  /**
   * コマンドライン引数をパース
   */
  static parseArgs(args: string[]): CommandOptions {
    const options: CommandOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === '--keywords' && i + 1 < args.length) {
        // --keywords "keyword1,keyword2,keyword3"
        const keywordsStr = args[i + 1];
        options.keywords = keywordsStr
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
        i++; // 次の引数をスキップ
      } else if (arg === '--skip-notify-if-empty') {
        options.skipNotifyIfEmpty = true;
      } else if (arg === '--max-articles' && i + 1 < args.length) {
        const maxStr = args[i + 1];
        const maxNum = parseInt(maxStr, 10);
        if (!isNaN(maxNum) && maxNum > 0) {
          options.maxArticles = maxNum;
        }
        i++; // 次の引数をスキップ
      }
    }

    return options;
  }

  /**
   * ヘルプメッセージを表示
   */
  static showHelp(): void {
    console.log(`
Daily News - RSS/Atom Feed Aggregator with Slack Notification

Usage:
  npm start [options]

Options:
  --keywords <keywords>       Comma-separated keywords to filter articles
                              (merged with default keywords from config)
                              Example: --keywords "React,TypeScript,Node.js"

  --skip-notify-if-empty      Skip Slack notification if no new articles found

  --max-articles <number>     Maximum number of articles to notify

  --help                      Show this help message

Environment Variables:
  SLACK_WEBHOOK_URL           Slack Incoming Webhook URL (required)
  NODE_ENV                    Environment (development/production/test)
  FEED_CONFIG_PATH            Path to feed configuration file
  STORAGE_PATH                Path to article storage file
  RETENTION_DAYS              Number of days to retain read articles
  MAX_RETRIES                 Maximum retry count for HTTP requests
  RETRY_DELAY_MS              Retry delay in milliseconds
  FETCH_TIMEOUT_MS            Fetch timeout in milliseconds

Examples:
  npm start
  npm start -- --keywords "React,Vue,Angular"
  npm start -- --keywords "TypeScript" --skip-notify-if-empty
  npm start -- --max-articles 10
    `);
  }
}
