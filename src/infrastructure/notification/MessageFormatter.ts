import { Article } from '../../domain/models/Article';
import { format } from 'date-fns';
import { translate } from '@vitalets/google-translate-api';

/**
 * Discord Embed フィールド
 */
export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Discord Embed
 */
export interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
  footer?: {
    text: string;
  };
  author?: {
    name: string;
    icon_url?: string;
  };
}

/**
 * Discord Webhook メッセージ
 */
export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

/**
 * Discordメッセージを整形するクラス
 */
export class MessageFormatter {
  /**
   * 記事リストをDiscord Embed形式のメッセージに変換
   */
  async formatArticles(articles: Article[], keywords: string[]): Promise<DiscordMessage> {
    const embeds: DiscordEmbed[] = [];

    // サマリーEmbed
    const summaryEmbed = this.createSummaryEmbed(articles, keywords);
    embeds.push(summaryEmbed);

    // 記事ごとのEmbed（サマリー1個 + 記事9個 = 合計10個まで）
    const maxArticles = Math.min(articles.length, 9);
    for (let i = 0; i < maxArticles; i++) {
      const articleEmbed = await this.formatArticle(articles[i]);
      embeds.push(articleEmbed);
    }

    return {
      content: `📰 **Daily Tech News** - ${articles.length}件の新着記事`,
      embeds,
      username: 'Daily News Bot',
    };
  }

  /**
   * サマリーEmbedを作成
   */
  private createSummaryEmbed(articles: Article[], keywords: string[]): DiscordEmbed {
    // キーワードを最大10個まで表示（Discordの文字数制限対策）
    const displayKeywords = keywords.slice(0, 10);
    const keywordsText =
      displayKeywords.length > 0
        ? displayKeywords.map((k) => `\`${k}\``).join(', ') +
          (keywords.length > 10 ? ` ...他${keywords.length - 10}個` : '')
        : 'なし';

    return {
      title: '📊 サマリー',
      description: `本日の新着記事をお届けします`,
      color: 0x5865f2, // Discord Blurple
      fields: [
        {
          name: '📝 記事数',
          value: `${articles.length}件`,
          inline: true,
        },
        {
          name: '🔍 キーワード',
          value: this.truncateText(keywordsText, 1024), // Discordのフィールド値の制限
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Daily News Bot',
      },
    };
  }

  /**
   * 単一の記事をEmbed形式にフォーマット
   */
  private async formatArticle(article: Article): Promise<DiscordEmbed> {
    const title = article.title;
    let description = article.description || '説明なし';

    // 英語の記事の場合、タイトルと説明を翻訳
    if (this.isEnglish(title)) {
      try {
        const translatedTitle = await this.translateToJapanese(title);
        const translatedDesc = article.description
          ? await this.translateToJapanese(article.description)
          : null;

        // タイトル: 原文と日本語訳を併記
        const displayTitle = `${this.truncateText(title, 120)}\n${this.truncateText(translatedTitle, 120)}`;

        // 説明: 原文と日本語訳を併記
        if (translatedDesc) {
          description = `${this.truncateText(article.description!, 100)}\n---\n${this.truncateText(translatedDesc, 100)}`;
        }

        const dateStr = format(article.publishedAt, 'yyyy-MM-dd HH:mm');

        return {
          title: this.truncateText(displayTitle, 256), // Discordのタイトル制限
          description: this.truncateText(description, 2048), // Discordの説明制限
          url: article.url,
          color: 0x00d9ff, // シアン
          fields: [
            {
              name: '📌 フィード',
              value: article.feedName,
              inline: true,
            },
            {
              name: '🕒 公開日時',
              value: dateStr,
              inline: true,
            },
          ],
          timestamp: article.publishedAt.toISOString(),
        };
      } catch (error) {
        // 翻訳失敗時は元のフォーマットを使用
        console.error('Translation failed:', error);
      }
    }

    // 日本語記事または翻訳失敗時は元のフォーマット
    const dateStr = format(article.publishedAt, 'yyyy-MM-dd HH:mm');
    return {
      title: this.truncateText(title, 256),
      description: this.truncateText(description, 2048),
      url: article.url,
      color: 0x00d9ff,
      fields: [
        {
          name: '📌 フィード',
          value: article.feedName,
          inline: true,
        },
        {
          name: '🕒 公開日時',
          value: dateStr,
          inline: true,
        },
      ],
      timestamp: article.publishedAt.toISOString(),
    };
  }

  /**
   * テキストを指定文字数で切り詰め
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * テキストが英語かどうかを判定
   */
  private isEnglish(text: string): boolean {
    // 英字の割合が60%以上なら英語と判定
    const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
    const totalCount = text.replace(/\s/g, '').length;
    return totalCount > 0 && alphaCount / totalCount > 0.6;
  }

  /**
   * テキストを日本語に翻訳
   */
  private async translateToJapanese(text: string): Promise<string> {
    try {
      const result = await translate(text, { to: 'ja' });
      return result.text;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // 翻訳失敗時は元のテキストを返す
    }
  }

  /**
   * エラーメッセージをフォーマット
   */
  formatError(error: Error): DiscordMessage {
    const embed: DiscordEmbed = {
      title: '⚠️ エラーが発生しました',
      description: `Daily News の実行中にエラーが発生しました`,
      color: 0xed4245, // Discord Red
      fields: [
        {
          name: 'エラーメッセージ',
          value: `\`\`\`\n${this.truncateText(error.message, 1000)}\n\`\`\``,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Daily News Bot',
      },
    };

    return {
      content: '⚠️ **エラー通知**',
      embeds: [embed],
      username: 'Daily News Bot',
    };
  }

  /**
   * 記事なしメッセージをフォーマット
   */
  formatNoArticles(keywords: string[]): DiscordMessage {
    const keywordsText = keywords.length > 0 ? keywords.map((k) => `\`${k}\``).join(', ') : 'なし';

    const embed: DiscordEmbed = {
      title: '📰 Daily Tech News',
      description: '本日は新着記事が見つかりませんでした',
      color: 0xfee75c, // Discord Yellow
      fields: [
        {
          name: '🔍 検索キーワード',
          value: keywordsText,
          inline: false,
        },
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Daily News Bot',
      },
    };

    return {
      content: '📰 **Daily Tech News**',
      embeds: [embed],
      username: 'Daily News Bot',
    };
  }
}
