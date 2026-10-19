# サムネイル生成仕様

## 概要

写真のサムネイルをオンザフライで生成し、redb（KVS）にキャッシュする。`image` クレートで画像処理を行い、自前の LIFO リミッターで並行制御する。

## 配信方式

カスタムプロトコル `thumb://` でサムネイルを配信する。フロントからは `convertFileSrc(photoId, "thumb")` でプラットフォーム差を吸収したURLを取得し、`<img>` の `src` に指定する。

```
thumb://localhost/{photo_id}                  — キャッシュがなければ生成して返す
thumb://localhost/{photo_id}?generate=false    — キャッシュがなければ404を返す
```

ブラウザキャッシュが有効になるため、同じサムネイルの再リクエストはネットワーク層で解決される。

プロトコルハンドラは `register_asynchronous_uri_scheme_protocol` で登録し、`std::thread::spawn` で非同期処理する。UIスレッドをブロックしない。

## 処理フロー

```
1. redbキャッシュ確認
   ヒット → 即返却
   ↓ ミス
2. generate=false → 404
   ↓
3. 実行枠を獲得 (同時生成数を制限、待機中は新しいリクエストから)
   ↓
4. redb再チェック (待機中に別スレッドが生成済みの可能性)
   ↓
5. preview_file の file_path を SELECT (SQLite、短時間ロック)
   ↓
6. 画像処理 (ロックなし)
   ファイル読み込み(1回) → EXIF Orientation読み取り → デコード → Orientation適用
   → 正方形クロップ+リサイズ(1パス) → WebPエンコード
   ↓
7. redb書き込み + SQLite UPDATE (短時間ロック)
   ↓
8. 実行枠を解放 → 返却
```

## サムネイル仕様

| 項目 | 値 |
|------|-----|
| サイズ | 256 x 256 px |
| EXIF Orientation | 自動適用 (1〜8の全回転状態に対応) |
| クロップ | 中央正方形クロップ |
| リサイズアルゴリズム | fast_image_resize (SIMD最適化、Lanczos3相当) |
| 出力フォーマット | WebP |

## ストレージ

### redb

- ファイル: `{app_data_dir}/thumbnails.redb`
- テーブル: `thumbnails`
- キー: `{photo_id}:{size}` (例: `a3b2c1d4-...:256`)
- 値: WebPバイナリ

キーにサイズを含めることで、将来異なる解像度のサムネイルを同一テーブルに共存できる。

### SQLite

`photos.thumbnail_generated_at` (UNIX TIME) で生成済みかどうかを管理する。

## 並行制御

### 同時生成数の制限 (LifoLimiter)

`thumbnail/limiter.rs` の `LifoLimiter`（`Mutex` + `Condvar`）で同時に画像処理を行うスレッド数を制限する。

- 上限: 物理コア数 - 1（`num_cpus::get_physical() - 1`、最低1スレッド）
- 1コアをOS・UIスレッド用に確保する
- 待機中のリクエストは**後から来た順（LIFO）**に通す。スクロールで通り過ぎたサムネより、今画面にあるサムネ（=最新のリクエスト）を優先するため
- redb書き込みが詰まった場合も実行枠が解放されないため、自然にバックプレッシャーがかかる

### フロント側の生成抑制

生成要求が待ち行列に溢れないよう、フロントは `DeferThumbnailContext`（`src/lib/deferThumbnail.ts`）で生成の要求を後回しにする。

- 仮想スクロール中、およびオーバースキャン行（画面外の先読み）では `?generate=false` でキャッシュのみ取得する
- キャッシュミスした `Thumbnail` は、後回し指定が解除された（スクロール停止・画面内に入った）時点で生成を要求する

### ロックの最小化

SQLiteの `Mutex<Connection>` は画像処理中は保持しない。SELECT と UPDATE の瞬間だけロックを取得する。

```
conn.lock() → SELECT file_path → unlock
  画像処理 (ロックなし)
conn.lock() → UPDATE thumbnail_generated_at → unlock
```

### ビルドプロファイル

dev時でも依存ライブラリは `opt-level = 2`、本クレートは `opt-level = 1` で最適化する。

`fast_image_resize` 等のジェネリック関数は呼び出し側（本クレート）で単相化されるため、依存側の最適化だけでは効かない。本クレートが `opt-level = 0` だとリサイズが約150倍遅くなる（24MPで 約1.2秒 → 約10ms）。

```toml
[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 2
```

## サムネイルの削除

再スキャン時にFSに存在しないphotosがDBから削除されると、対応するサムネイルもredbから削除される。この処理は `scan.rs` のオーケストレーション層で行う。

## エラー処理

- 読み取れないファイル（破損、非対応フォーマット等）はスキップし、404を返す
- ファイルが存在しない場合も404を返す（DBからの削除は再スキャンに任せる）
- redb/SQLiteの書き込みエラーは無視する（サムネイルは再生成可能なため）

## モジュール構成

```
src-tauri/src/thumbnail/
  mod.rs          — pub use で公開API定義
  store.rs        — ThumbnailStore (redb操作: get/set/delete)
  generate.rs     — 画像処理 (デコード→クロップ→リサイズ→エンコード)
  limiter.rs      — LifoLimiter (同時生成数の制限)
  protocol.rs     — ThumbnailState + handle_request (プロトコルハンドラ)
```

- `store.rs`: redbの読み書きに専念
- `generate.rs`: 純粋な画像処理（EXIF Orientation読み取り・適用を含む）、DBやredbに依存しない
- `limiter.rs`: LifoLimiter (同時実行数の制限、LIFO順)
- `protocol.rs`: キャッシュ確認・実行枠の獲得・生成・保存のフロー全体を制御

### EXIF Orientation

`generate.rs` 内の `read_orientation` でEXIF Orientationタグ (1〜8) を読み取り、`apply_orientation` でクロップ前に画像を回転・反転する。Orientationが取得できない場合はデフォルト値 (1: 無回転) を使用する。

| Orientation | 変換 |
|:-----------:|------|
| 1 | なし |
| 2 | 水平反転 |
| 3 | 180°回転 |
| 4 | 垂直反転 |
| 5 | 90°回転 + 水平反転 |
| 6 | 90°回転 |
| 7 | 270°回転 + 水平反転 |
| 8 | 270°回転 |

## 将来の拡張

- **解像度の設定化**: 現在は定数 (`THUMBNAIL_SIZE = 256`) だが、config化して可変にできる
- **リサイズアルゴリズム変更**: `fast_image_resize` の `ResizeOptions` でアルゴリズムを変更可能
- **RAW対応**: RAWファイルのサムネイル生成には別途デコーダが必要
