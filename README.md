# Sift

ローカルの写真を管理するデスクトップアプリケーション。
指定したディレクトリ内の写真を参照型で管理する（ファイルの移動・コピーは行わない）。

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フレームワーク | Tauri 2 |
| フロントエンド | React + TypeScript (Vite) |
| バックエンド | Rust |
| メタデータDB | SQLite (rusqlite + tauri-plugin-sql) |
| BLOBストレージ | redb (サムネイル等) |
| マイグレーション | refinery |

## 開発

```bash
bun install
bun run tauri dev
```

## ドキュメント

- [アーキテクチャ](docs/architecture.md)
- [ER図](docs/er-diagram.md)
