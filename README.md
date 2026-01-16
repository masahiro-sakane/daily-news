# Daily News

RSS/Atomフィードから技術記事を取得してDiscordに通知するシステム

## 概要

Daily Newsは、指定されたRSS/Atomフィードから技術記事を取得し、キーワードでフィルタリングして、新着記事のみをDiscordに通知するNode.jsアプリケーションです。

### 主な機能

- 複数のRSS/Atomフィードからの記事取得（並行処理）
- キーワードベースの記事フィルタリング（OR/AND戦略）
- 既読記事の管理（重複通知の防止）
- Discord Embedを使用したリッチな通知
- リトライロジック（フィード取得・Discord通知）
- GitHub Actionsによる自動実行（毎日）
- Domain-Driven Design (DDD) アーキテクチャ

## アーキテクチャ

このプロジェクトはDDDとクリーンアーキテクチャの原則に従って設計されています。

```
src/
├── domain/              # ドメイン層（ビジネスロジック）
│   ├── models/          # エンティティ（Article, Feed, ArticleFilter）
│   ├── repositories/    # リポジトリインターフェース
│   └── services/        # ドメインサービス
├── application/         # アプリケーション層（ユースケース）
│   ├── dto/             # データ転送オブジェクト
│   └── usecases/        # ユースケース実装
├── infrastructure/      # インフラストラクチャ層（外部依存）
│   ├── config/          # 設定管理
│   ├── feed/            # フィード取得・パース
│   ├── persistence/     # データ永続化
│   └── notification/    # 通知機能
├── presentation/        # プレゼンテーション層（UI/CLI）
│   └── cli/             # コマンドラインインターフェース
└── shared/              # 共通ユーティリティ
    ├── errors/          # カスタムエラー
    └── logger/          # ロギング
```

## セットアップ

### 必要な環境

- Node.js 20.x 以上
- npm 10.x 以上

### インストール

1. リポジトリをクローン

```bash
git clone https://github.com/yourusername/daily-news.git
cd daily-news
```

2. 依存関係をインストール

```bash
npm install
```

3. 環境変数を設定

`.env.example`をコピーして`.env`を作成し、必要な値を設定します。

```bash
cp .env.example .env
```

`.env`ファイルを編集してDiscord Webhook URLを設定：

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

### Discord Webhook URLの取得方法

1. Discordサーバーで通知を受け取りたいチャンネルの設定を開く
2. 「連携サービス」タブを選択
3. 「ウェブフック」→「新しいウェブフック」をクリック
4. ウェブフックに名前を付ける（例: Daily News Bot）
5. 「ウェブフックURLをコピー」をクリック
6. コピーしたURLを`.env`ファイルの`DISCORD_WEBHOOK_URL`に設定

## 使用方法

### ビルド

```bash
npm run build
```

### 実行

#### 基本的な実行

```bash
npm start
```

#### カスタムキーワードを指定

```bash
npm start -- --keywords "React,TypeScript,Docker"
```

#### オプション

- `--keywords <keywords>`: フィルタリング用のキーワード（カンマ区切り）
  - デフォルトキーワードとマージされます
  - 例: `--keywords "React,Vue,Angular"`

- `--skip-notify-if-empty`: 新着記事がない場合は通知をスキップ

- `--max-articles <number>`: 通知する最大記事数
  - 例: `--max-articles 10`

- `--help`: ヘルプメッセージを表示

### 開発モード

```bash
npm run dev
```

### Lint

```bash
npm run lint        # チェックのみ
npm run lint:fix    # 自動修正
```

### フォーマット

```bash
npm run format
```

## 設定ファイル

### feeds.json

フィードとキーワードの設定を管理します。

```json
{
  "feeds": [
    {
      "name": "Zenn",
      "url": "https://zenn.dev/feed",
      "type": "rss",
      "enabled": true
    }
  ],
  "keywords": [
    "React",
    "TypeScript",
    "Node.js"
  ]
}
```

#### フィールド説明

- `name`: フィード名（通知メッセージに表示）
- `url`: フィードのURL
- `type`: フィードタイプ（`rss` または `atom`）
- `enabled`: フィードの有効/無効

### 環境変数

| 変数名 | 説明 | デフォルト値 |
|--------|------|--------------|
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL（必須） | - |
| `NODE_ENV` | 実行環境 | `development` |
| `FEED_CONFIG_PATH` | フィード設定ファイルのパス | `config/feeds.json` |
| `STORAGE_PATH` | 既読記事保存ファイルのパス | `data/read-articles.json` |
| `RETENTION_DAYS` | 既読記事の保持日数 | `30` |
| `MAX_RETRIES` | HTTPリクエストの最大リトライ回数 | `3` |
| `RETRY_DELAY_MS` | リトライ待機時間（ミリ秒） | `1000` |
| `FETCH_TIMEOUT_MS` | フィード取得のタイムアウト（ミリ秒） | `10000` |

## GitHub Actionsによる自動実行

このプロジェクトは、GitHub Actionsを使用して毎日自動実行されます。

### スケジュール

- **定期実行**: 毎日 UTC 0:00（JST 9:00）
- **手動実行**: GitHub UIから任意のタイミングで実行可能

### 設定方法

1. GitHubリポジトリのSettings → Secrets and variablesに移動
2. "New repository secret"をクリック
3. 以下のシークレットを追加：
   - `SLACK_WEBHOOK_URL`: Discord Webhook URL

### 手動実行

1. GitHubリポジトリのActionsタブに移動
2. "Daily News"ワークフローを選択
3. "Run workflow"をクリック
4. オプションでパラメータを指定：
   - **Custom keywords**: カスタムキーワード（カンマ区切り）
   - **Skip notification if no new articles**: 新着記事なしの場合は通知をスキップ
   - **Maximum number of articles**: 通知する最大記事数

## データ管理

### 既読記事の保存

既読記事は`data/read-articles.json`に保存されます。このファイルはGitHub Actionsによって自動的にコミット・プッシュされます。

### データ保持期間

既読記事は`RETENTION_DAYS`（デフォルト: 30日）で指定された日数後に自動的に削除されます。

## トラブルシューティング

### Discord通知が届かない

1. `.env`ファイルの`SLACK_WEBHOOK_URL`が正しいか確認
2. Webhook URLが有効か確認（Discord APIコンソールで確認）
3. ログファイルでエラーメッセージを確認

### フィードが取得できない

1. `config/feeds.json`のURLが正しいか確認
2. フィードのURLにアクセス可能か確認
3. `FETCH_TIMEOUT_MS`を増やしてみる
4. ログで具体的なエラーメッセージを確認

### 新着記事が表示されない

1. キーワード設定が厳しすぎないか確認
2. `data/read-articles.json`を削除して再実行（すべての記事が新着扱いになります）
3. フィードのURLに新しい記事があるか確認

## ライセンス

MIT

## 貢献

プルリクエストを歓迎します。大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 作者

Your Name

## 参考リンク

- [RSS Parser](https://github.com/rbren/rss-parser)
- [Discord Block Kit](https://api.slack.com/block-kit)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Domain-Driven Design](https://martinfowler.com/tags/domain%20driven%20design.html)
