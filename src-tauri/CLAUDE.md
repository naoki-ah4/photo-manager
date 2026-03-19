# バックエンド (Rust / Tauri v2)

## 技術スタック

- **Tauri v2** (デスクトップアプリフレームワーク)
- **rusqlite** (SQLite ドライバー, WALモード)
- **refinery** (SQLマイグレーション)
- **redb** (サムネイルキャッシュ用 組み込みKVストア)
- **image** + **fast_image_resize** (画像処理)
- **kamadak-exif** (EXIF メタデータ抽出)
- **rayon** (並列処理)

## 設計方針

- FS操作はDBロックの外で行い、DB操作はトランザクション内でバッチ処理する
- 重い処理 (EXIF抽出など) はチャンク単位で処理する
- サムネイルは redb に永続キャッシュし、カスタムURIスキームでオンデマンド配信する
- セマフォによりCPU負荷の高い処理の同時実行数を制限する
- SQLマイグレーションは refinery 形式 (`V{N}__{name}.sql`) で管理する

## コーディングルール

### フォーマット

- `rustfmt.toml` に従う (ソフトタブ, 2スペースインデント)
- コミット時に `rustfmt` が自動実行される

### 命名規則

- 関数・変数: `snake_case`
- 型・構造体・列挙型: `PascalCase`
- 定数: `SCREAMING_SNAKE_CASE`
- モジュール: `snake_case`

### 一般ルール

- `unwrap()` / `expect()` は原則使用しない。`Result` / `Option` を適切にハンドリングすること
- 公開APIには適切なエラー型を定義すること
- `clippy` の警告はすべて解消すること
