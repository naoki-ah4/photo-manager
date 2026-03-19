# Photo Manager

写真管理アプリ。写真を一覧表示し検索をかけるためのデスクトップアプリケーション。

## 技術スタック

- **フレームワーク**: Tauri v2 (Rust + Web)
- **フロントエンド**: React + TypeScript + Vite + Mantine UI
- **バックエンド**: Rust
- **データベース**: SQLite (WALモード) + redb (サムネイルキャッシュ)
- **パッケージマネージャ**: Bun
- **リンター/フォーマッター**: Biome (フロントエンド) / rustfmt + clippy (バックエンド)

## 開発コマンド

```bash
bun install          # 依存インストール
bun run tauri dev    # 開発サーバー起動
bun run tauri build  # プロダクションビルド
```

## pre-commit フック

Husky + lint-staged により、コミット時に以下が自動実行される:
- JS/TS ファイル: `biome check --write`
- Rust ファイル: `rustfmt`

## フロントエンド
[フロントエンド向けCLAUDE.md](src/CLAUDE.md) を参照

## バックエンド
[バックエンド向けCLAUDE.md](src-tauri/CLAUDE.md) を参照
