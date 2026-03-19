# スキャン仕様

## 概要

監視フォルダ（`watch_folders`）に登録されたディレクトリを走査し、対応フォーマットの画像ファイルを検出してDBに登録する。写真ファイル自体の移動・コピーは行わない（参照型）。

## Tauriコマンド

### `scan_one`

指定されたwatch_folderを走査し、結果をDBにupsertする。

| パラメータ | 型 | 必須 | 説明 |
|-----------|------|:---:|------|
| `watch_folder_id` | `String` | Yes | 監視フォルダのID |

戻り値: 処理した写真の件数 (`usize`)

### `scan_all`

`watch_folders` テーブルに登録された全フォルダを順次走査する。内部的に `scan_one` を各watch_folderに対して呼び出す。存在しないディレクトリはスキップされる。

| パラメータ | なし |
|-----------|------|

戻り値: 処理した写真の合計件数 (`usize`)

## 処理フロー

```
1. ファイルシステム走査 (scanner::scan_folder)
   walkdirでディレクトリを再帰走査し、対応拡張子のファイルを収集
   ↓
2. DB永続化 (scanner::upsert_scan_results)
   トランザクション内でディレクトリ・写真をupsert
   ↓
3. 不在ファイルの削除
   スキャン開始時刻より updated_at が古いphotosをDELETE
   対応するサムネイルもredbから削除
```

### 1. ファイルシステム走査

`walkdir` クレートを使用してディレクトリを走査する。

- `recursive = true`: 全階層を再帰走査
- `recursive = false`: `max_depth(1)` で直下のみ
- 権限エラー等でアクセスできないエントリはスキップ（`filter_map(|e| e.ok())`）

各ファイルから以下の情報を収集する:

| フィールド | 取得元 |
|-----------|--------|
| `file_path` | ファイルの絶対パス |
| `file_name` | ファイル名 |
| `file_size` | `metadata().len()` |
| `file_modified_at` | `metadata().modified()` |
| `parent_dir` | 親ディレクトリのパス |

### 2. DB永続化

1件のトランザクション内で以下を実行する:

1. **ディレクトリの登録** (`ensure_directory`)
   - 写真の `parent_dir` からwatch_folderルートまでの祖先ディレクトリを再帰的に登録
   - 既存のディレクトリは `SELECT id` で取得して再利用
   - パス → ID のHashMapキャッシュで重複SELECTを回避

2. **写真のupsert**
   - `file_path` のUNIQUE制約で重複判定
   - 新規: INSERT
   - 既存: `file_size`, `file_modified_at`, `updated_at` を更新（`ON CONFLICT ... DO UPDATE`）

### 3. 不在ファイルの削除

upsert後、同一トランザクション内で以下を実行する:

1. `updated_at < scan_started_at` のphotosのIDを取得
2. 該当photosをDELETE
3. photosが0件になったdirectoriesもDELETE
4. トランザクション完了後、削除されたphoto_idのサムネイルをredbから削除

**外付けHDD対策**: watch_folderのルートパスが存在しない場合はそのフォルダのスキャンをスキップする。接続されていないだけで写真が消えることはない。

## 対応フォーマット

| 拡張子 |
|--------|
| jpg, jpeg |
| png |
| gif |
| webp |
| tiff, tif |
| bmp |
| heic, heif |

拡張子の判定は大文字・小文字を区別しない。RAWフォーマットは将来対応予定。

## 差分更新の仕組み

`photos` テーブルに以下のタイムスタンプ（UNIX TIME）を持つ:

| カラム | 用途 |
|--------|------|
| `file_modified_at` | ファイルの最終更新日時（スキャン時に取得） |
| `metadata_extracted_at` | EXIF抽出が完了した日時 |
| `thumbnail_generated_at` | サムネイル生成が完了した日時 |

EXIF抽出やサムネイル生成は、以下の条件で再処理対象を判定する:

```sql
-- EXIF未抽出 or ファイル更新後に未再抽出
WHERE metadata_extracted_at IS NULL
   OR file_modified_at > metadata_extracted_at
```

スキャン自体は毎回全ファイルを走査するが、upsertにより既存レコードは更新日時のみ反映される。

## モジュール構成

```
src-tauri/src/
  scan.rs             — scan_one + scan_all（オーケストレーション）
  scanner/
    mod.rs            — pub use で公開API定義
    walk.rs           — ファイルシステム走査 (scan_folder, ScannedEntry)
    persist.rs        — DB永続化 (upsert_scan_results, ensure_directory)
```

- `scan.rs` がscannerとthumbnailを統合するオーケストレーション層
- `scanner/` は低レベルの走査・永続化に専念
- 走査（I/O）と永続化（DB）を分離し、`walk.rs` はDBに依存しない
