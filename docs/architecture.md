# アーキテクチャ

## 概要

参照型の写真管理アプリ。ユーザーが指定したディレクトリ内の写真をスキャンし、メタデータをDBに記録して管理する。写真ファイル自体の移動・コピーは行わない。

## データストア

### SQLite — メタデータ

写真のメタデータ、ディレクトリ構造、監視フォルダ情報を格納する。

- **接続設定**: WALモード、busy_timeout=5000ms、foreign_keys=ON
- **マイグレーション**: refinery (`src-tauri/migrations/` 配下のSQLファイル)
- **DBファイル**: `{app_data_dir}/library.db`
- **日時型**: INTEGER (UNIX TIME) で統一。`taken_at` のみEXIFにTZ情報がないためTEXT。

#### WALモード

SQLiteのデフォルトではDB書き込み中に読み取りもブロックされる。WAL (Write-Ahead Logging) モードを有効にすることで、書き込み中でも読み取りが可能になる。Rust側で重い書き込み（スキャン等）を行いながら、フロント側で一覧表示を行うために必要。

ただし同時書き込みはWALモードでも不可（SQLiteの設計上の制限）。書き込みが競合した場合は `busy_timeout` で自動リトライされる。

#### TS / Rust 両方からのアクセス

同一のSQLiteファイルに対して、フロントエンド (tauri-plugin-sql) とバックエンド (rusqlite) の両方からアクセスする。

| アクセス元 | 用途 |
|-----------|------|
| Rust (rusqlite) | フォルダスキャン・一括INSERT、EXIF解析、ファイルハッシュ計算、ファイル監視 |
| TS (tauri-plugin-sql) | 一覧取得、タグ/アルバムCRUD、レーティング更新など軽量な読み書き |

役割分担の原則: I/O・CPU負荷の高い処理はRust、CRUD中心の操作はフロントから直接。

### redb — BLOBストレージ

サムネイル等のバイナリデータを格納するKVS。

SQLiteにBLOBを格納するとDBファイルが肥大化し、バックアップやマイグレーションに悪影響が出るため、redbで分離する。テーブル単位でデータ種別を分けられる（例: thumbnails, previews）。

## ディレクトリ管理

`watch_folders` が監視ルートを表し、`directories` がその配下のディレクトリ構造を再帰的に記録する。

```
watch_folders  (監視ルート)
  └── directories  (配下の全ディレクトリ)
        └── photos  (各ディレクトリに属する写真)
```

`directories` テーブルは `path`（検索用）と `parent_id`（ツリー構造表現用）の両方を持つ。`path` は `parent_id` の再帰JOINで導出可能だが、毎回再帰CTEを実行するのはコストが高いため、冗長に保持している。

監視フォルダ削除時は CASCADE で配下の directories, photos も削除される。

## バックエンド モジュール構成

```
src-tauri/src/
  lib.rs              — アプリ起動、プロトコル登録
  db.rs               — DbState, init_db（DB基盤のみ）
  commands.rs          — Tauriコマンド（薄いラッパー）
  scan.rs              — scan_one + scan_all（オーケストレーション）
  exif.rs              — EXIF抽出
  photo.rs             — photo:// プロトコルハンドラ（元画像配信）
  scanner/
    mod.rs
    walk.rs            — FS走査
    persist.rs         — DB upsert + 不在ファイル削除
  thumbnail/
    mod.rs
    store.rs           — ThumbnailStore (redb操作)
    generate.rs        — 画像処理 (crop/resize/encode)
    protocol.rs        — ThumbnailState + handle_request
```

### レイヤー構造

```
commands.rs          Tauriコマンド定義（State受け取り → モジュール呼び出し）
  ↓
scan.rs              scannerとthumbnailを統合するオーケストレーション
  ↓
scanner/             FS走査 + DB永続化
thumbnail/           画像処理 + redbストレージ + プロトコルハンドラ
photo.rs             元画像のプロトコルハンドラ
exif.rs              EXIF解析 + DB更新
  ↓
db.rs                DB接続・初期化の基盤
```

## カスタムURIスキーム

| プロトコル | 用途 | 処理 |
|-----------|------|------|
| `thumb://` | サムネイル配信 | redbキャッシュ → 未生成時はオンデマンド生成 |
| `photo://` | 元画像配信 | DBからfile_pathを引き、ファイルを読んで返す |

## フロントエンド構成

### コンポーネント設計

Atomic Designに基づく分類。各コンポーネントはディレクトリ単位で `index.tsx` にまとめる。

```
src/components/
  atoms/           — 最小単位の表示部品
  molecules/       — atomsの組み合わせ
  organisms/       — 独立した機能ブロック
  templates/       — ページレイアウト構造
  pages/           — ルートに対応するページ
```

### ルーティング

wouter によるクライアントサイドルーティング。

```
/                                    — 全写真一覧
/folders/:folderId                   — フォルダ内写真一覧
/folders/:folderId/photos/:id        — 写真ビューワー (folderId="all" で全体)
/settings                            — 設定
```

ビューワーのルートにfolderIdを含めることで、遷移元のコンテキスト（全体 or フォルダ）がURLから確定する。

### データ取得

- **DBクエリ**: 各コンポーネント内で `lib/db.ts` 経由のKyselyクエリを直接記述
- **IPCコマンド**: `lib/commands.ts` に `invoke` 呼び出しを集約
- **キャッシュ**: SWR。キーは `lib/swrKeys.ts` で一元管理

## 実装フェーズ

### Phase 1: 基盤 — DB初期化 + フォルダスキャン
- SQLiteスキーマ作成（マイグレーション済み）
- `watch_folders` に登録 → Rustでディレクトリを再帰走査 → `photos` テーブルにINSERT
- フロントから写真一覧をSELECTして表示

### Phase 2: EXIF + サムネイル
- Rust側でEXIF解析 → メタデータ書き込み
- サムネイル生成 → redbに保存
- カスタムプロトコル `thumb://` でサムネイル配信
- 仮想スクロールでグリッド表示

### Phase 3: タグ / アルバム
- スキーマ追加（マイグレーション）
- フロントからCRUD

### Phase 4: 検索 + ファイル監視
- EXIF条件検索、全文検索
- `notify` クレートでリアルタイム同期
- RAW対応（将来）
