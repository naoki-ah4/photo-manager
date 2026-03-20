# フロントエンド

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| UIライブラリ | React + TypeScript |
| ビルド | Vite |
| UIコンポーネント | Mantine UI (PostCSSなし) |
| ルーティング | wouter |
| データ取得 | SWR + Kysely (tauri-plugin-sql) |
| 画像ズーム/パン | @panzoom/panzoom |
| リンター/フォーマッター | Biome |
| スタイリング | CSS Modules |

## ルーティング

```
/                                    — Library (全写真一覧)
/folders/:folderId                   — FolderView (フォルダ内写真一覧)
/folders/:folderId/photos/:id        — PhotoViewer (写真ビューワー)
/settings                            — Settings (設定)
```

### ビューワーのルート設計

写真ビューワーは `/folders/:folderId/photos/:id` で統一。Libraryからの遷移時は `folderId="all"` を使う。

URLに遷移元コンテキストを持たせることで:
- 戻るボタンの遷移先を判定できる (all → `/`, それ以外 → `/folders/:folderId`)
- 将来の前後ナビゲーションで、どのリストを使うかがURLから確定する

## データ取得

### DBクエリ

フロントからSQLiteに直接アクセスする。Kysely + tauri-plugin-sql による型安全なクエリビルダーを使用。

- クエリは使用するコンポーネント内に記述する（共通化が必要な場合は `lib/` に切り出す）
- 型定義は `lib/schema.ts` (kysely-codegenで自動生成) と `lib/types.ts` に集約

### IPCコマンド

CPUバウンドな処理はRust側で実行し、`invoke` で呼び出す。

| コマンド | 用途 |
|---------|------|
| `scan_one` | 指定フォルダのスキャン |
| `scan_all` | 全フォルダの一括スキャン |
| `extract_exif` | EXIF未抽出の写真を処理 |

`invoke` 呼び出しは `lib/commands.ts` に集約。

### SWRキー管理

`lib/swrKeys.ts` でキーを一元管理する。

```typescript
SWRKeys.watchFolders(scope)   // ["watch_folders", scope]
SWRKeys.photos(folderId?)     // ["photos", folderId] | ["photos"]
```

同じテーブルでも用途が異なる場合はスコープで分ける（例: sidebar用とsettings用の`watchFolders`）。テーブル名をプレフィックスにすることで、`mutate` によるプレフィックスマッチでの一括無効化が可能。

## 画像表示

### サムネイル

`thumb://` プロトコル経由。`convertFileSrc(photoId, "thumb")` で URL を生成。redb にキャッシュがあればそのまま返し、なければオンデマンドで生成。

### 元画像

`photo://` プロトコル経由。`convertFileSrc(photoId, "photo")` で URL を生成。DBから `file_path` を引き、ファイルを読んで返す。

### panzoom

ImageViewerコンポーネントで `@panzoom/panzoom` を使用。画像の `onLoad` イベント後にpanzoomを初期化する（ロード前の初期化はレンダリング不具合の原因になる）。
