# フロントエンド

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| UIライブラリ | React + TypeScript |
| ビルド | Vite |
| UIコンポーネント | Mantine UI (PostCSSなし) |
| ルーティング | wouter |
| データ取得 | SWR + Kysely (tauri-plugin-sql) |
| 画像ズーム/パン | react-zoom-pan-pinch |
| リンター/フォーマッター | Biome |
| スタイリング | CSS Modules |

## ルーティング

```
/                                    — Library (全写真一覧)
/directories/:directoryId            — FolderView (フォルダ内写真一覧)
/directories/:directoryId/photos/:id — PhotoViewer (写真ビューワー)
/settings                            — Settings (設定)
```

### ビューワーのルート設計

写真ビューワーは `/directories/:directoryId/photos/:id` で統一。Libraryからの遷移時は `directoryId="all"` を使う。

URLに遷移元コンテキストを持たせることで:
- 戻るボタンの遷移先を判定できる (all → `/`, それ以外 → `/directories/:directoryId`)
- 前後ナビゲーション（矢印キー）で、どのリストを使うかがURLから確定する

## データ取得

### DBクエリ

フロントからSQLiteに直接アクセスする。Kysely + tauri-plugin-sql による型安全なクエリビルダーを使用。

- クエリは使用するコンポーネント内に記述する（共通クエリは `lib/queries/` に切り出す）
  - `lib/queries/photos.ts` — 検索条件付き写真取得
  - `lib/queries/searchSuggestions.ts` — カメラ・レンズの候補取得
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
SWRKeys.watchFolders(scope)                    // ["watch_folders", scope]
SWRKeys.directories()                          // ["directories"]
SWRKeys.photos(directoryId?, searchQuery?)     // ["photos", directoryId, searchQuery?]
SWRKeys.distinctCameras()                      // ["distinct_cameras"]
SWRKeys.distinctLenses()                       // ["distinct_lenses"]
```

同じテーブルでも用途が異なる場合はスコープで分ける（例: sidebar用とsettings用の`watchFolders`）。テーブル名をプレフィックスにすることで、`mutate` によるプレフィックスマッチでの一括無効化が可能。

## 画像表示

### サムネイル

`thumb://` プロトコル経由。`convertFileSrc(photoId, "thumb")` で URL を生成。redb にキャッシュがあればそのまま返し、なければオンデマンドで生成。

### 元画像

`photo://` プロトコル経由。`convertFileSrc(photoId, "photo")` で URL を生成。DBから `file_path` を引き、ファイルを読んで返す。

### react-zoom-pan-pinch

ImageViewerコンポーネントで `react-zoom-pan-pinch` を使用。Reactコンポーネントとして宣言的にズーム・パン操作を組み込める。

## 検索

`lib/search.ts` がクエリ文字列をトークンに分割し、Kyselyクエリに変換する。

### トークン構文

| トークン | 説明 | 例 |
|---------|------|-----|
| `camera:値` | カメラメーカー/機種の部分一致 | `camera:Canon` |
| `lens:値` | レンズ名の部分一致 | `lens:14mm` |
| `before:日付` | 撮影日の上限（inclusive） | `before:2023-12-31` |
| `after:日付` | 撮影日の下限（inclusive） | `after:2023-01-01` |
| `sort:条件` | ソート指定（複数可） | `sort:date-desc,rating-asc` |

大文字小文字を区別しない（`LOWER()` でSQL LIKE検索）。デフォルトソートは `taken_at DESC`（未設定時は `file_modified_at` にフォールバック）。

### オートコンプリート

SearchInputコンポーネントがカメラ・レンズの候補をDBから取得し、入力補完を提供する。

## カスタムフック

| フック | 用途 |
|--------|------|
| `lib/usePhotoContextMenu.ts` | 写真アイテムの右クリックメニュー制御 |
| `lib/useScrollRestoration.ts` | ディレクトリ間遷移時のスクロール位置保存・復元 |

## UIパターン

- **仮想スクロール**: `@tanstack/react-virtual` によるグリッド・リスト両対応
- **ビュー切替**: グリッド/リストの切り替え（sessionStorageに保存）
- **スクロール復元**: ディレクトリごとにスクロール位置を保持
- **レスポンシブグリッド**: ResizeObserverでコンテナ幅を監視し、列数を動的に変更（576/768/1024pxブレークポイント）
- **コンテキストメニュー**: 右クリックでエクスプローラーで開く等の操作（tauri-plugin-opener）
- **プログレス通知**: バックグラウンドスキャン・EXIF抽出のトースト通知
