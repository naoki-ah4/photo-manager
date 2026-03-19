# サムネイル生成仕様

## 概要

写真のサムネイルをオンザフライで生成し、redb（KVS）にキャッシュする。`image` クレートで画像処理を行い、`std-semaphore` で並行制御する。

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
3. セマフォ取得 (同時生成数を制限)
   ↓
4. redb再チェック (セマフォ待ち中に別スレッドが生成済みの可能性)
   ↓
5. SELECT file_path (SQLite、短時間ロック)
   ↓
6. 画像処理 (ロックなし)
   デコード → 正方形クロップ → 256pxリサイズ → WebPエンコード
   ↓
7. redb書き込み + SQLite UPDATE (短時間ロック)
   ↓
8. セマフォ解放 → 返却
```

## サムネイル仕様

| 項目 | 値 |
|------|-----|
| サイズ | 256 x 256 px |
| クロップ | 中央正方形クロップ |
| リサイズアルゴリズム | Triangle（バイリニア） |
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

### 同時生成数の制限 (std-semaphore)

`std_semaphore::Semaphore` で同時に画像処理を行うスレッド数を制限する。

- 上限: 物理コア数 - 1（`num_cpus::get_physical() - 1`、最低1スレッド）
- 1コアをOS・UIスレッド用に確保する
- redb書き込みが詰まった場合もセマフォが解放されないため、自然にバックプレッシャーがかかる

### ロックの最小化

SQLiteの `Mutex<Connection>` は画像処理中は保持しない。SELECT と UPDATE の瞬間だけロックを取得する。

```
conn.lock() → SELECT file_path → unlock
  画像処理 (ロックなし)
conn.lock() → UPDATE thumbnail_generated_at → unlock
```

### ビルドプロファイル

`image` クレート等の依存ライブラリはdev時でも `opt-level = 2` で最適化する。未最適化だとデコード・リサイズが10倍以上遅くなる。

```toml
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
  protocol.rs     — ThumbnailState + handle_request (プロトコルハンドラ)
```

- `store.rs`: redbの読み書きに専念
- `generate.rs`: 純粋な画像処理、DBやredbに依存しない
- `protocol.rs`: キャッシュ確認・セマフォ・生成・保存のフロー全体を制御

## 将来の拡張

- **解像度の設定化**: 現在は定数 (`THUMBNAIL_SIZE = 256`) だが、config化して可変にできる
- **リサイズ高速化**: `fast_image_resize` クレートでSIMDリサイズに差し替え可能
- **RAW対応**: RAWファイルのサムネイル生成には別途デコーダが必要
