import { DailyNewsCommand } from './presentation/cli/DailyNewsCommand';
import { logger } from './shared/logger/Logger';

/**
 * メインエントリーポイント
 */
async function main(): Promise<void> {
  try {
    // コマンドライン引数を取得（node と script path を除く）
    const args = process.argv.slice(2);

    // ヘルプオプションのチェック
    if (args.includes('--help') || args.includes('-h')) {
      DailyNewsCommand.showHelp();
      process.exit(0);
    }

    // コマンドライン引数をパース
    const options = DailyNewsCommand.parseArgs(args);

    // Daily Newsコマンドを実行
    const command = new DailyNewsCommand();
    await command.execute(options);

    // 正常終了
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error occurred:', error);

    // エラーログを出力
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      if (error.stack) {
        console.error(error.stack);
      }
    } else {
      console.error('Unknown error:', error);
    }

    // 異常終了
    process.exit(1);
  }
}

// プロセスの未処理エラーハンドリング
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// メイン関数を実行
main();
