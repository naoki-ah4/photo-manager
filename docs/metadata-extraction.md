# メタデータ抽出仕様

## 概要

スキャン済みの写真ファイルからEXIFメタデータを抽出し、DBに書き込む。`kamadak-exif` クレートを使用。

## Tauriコマンド

### `extract_exif`

未処理またはファイル更新後のEXIF未抽出写真を対象にメタデータを抽出する。

| パラメータ | なし |
|-----------|------|

戻り値: 処理した写真の件数 (`usize`)

## 処理フロー

```
1. 対象写真の取得 (fetch_pending)
   WHERE metadata_extracted_at IS NULL
      OR file_modified_at > metadata_extracted_at
   ↓
2. 100枚ずつチャンク処理:
   a. EXIF読み取り (read_exif) — ロックなし
   b. トランザクションで一括UPDATE — 1回のロック
      metadata_extracted_atを現在時刻(UNIX TIME)で更新
   c. プログレスイベント発行 (exif:progress)
```

### チャンク処理

EXIF読み取りをまとめて行い、結果を集めてからトランザクション内で一括UPDATEする。

- ロック回数: N件 → チャンク数回に削減
- ディスク書き込み: トランザクション単位に集約
- WAL肥大化防止: 1トランザクションあたり100件に抑える

## 抽出するフィールド

| DBカラム | EXIFタグ | 型 | 備考 |
|---------|----------|------|------|
| `width` | `PixelXDimension` | `u32` | |
| `height` | `PixelYDimension` | `u32` | |
| `taken_at` | `DateTimeOriginal` | `String` | 撮影日時。EXIFにTZ情報がないためTEXTで保存 |
| `camera_make` | `Make` | `String` | カメラメーカー |
| `camera_model` | `Model` | `String` | カメラ機種 |
| `lens_model` | `LensModel` | `String` | レンズ名 |
| `iso` | `PhotographicSensitivity` | `u32` | ISO感度 |
| `f_number` | `FNumber` | `f64` | 絞り値 (Rational) |
| `exposure_time` | `ExposureTime` | `f64` | シャッタースピード (秒数をREALで保存、表示時にフォーマット) |
| `focal_length` | `FocalLength` | `f64` | 実焦点距離mm (Rational) |
| `focal_length_35mm` | `FocalLengthIn35mmFilm` | `f64` | 35mm換算焦点距離。カメラが記録していない場合はNULL |
| `gps_latitude` | `GPSLatitude` + `GPSLatitudeRef` | `f64` | 十進法に変換。南緯は負の値 |
| `gps_longitude` | `GPSLongitude` + `GPSLongitudeRef` | `f64` | 十進法に変換。西経は負の値 |

## GPS座標の変換

EXIFのGPS座標は度・分・秒の3つのRational値で格納されている。十進法への変換:

```
decimal = degrees + minutes/60 + seconds/3600
```

`GPSLatitudeRef` が `"S"` または `GPSLongitudeRef` が `"W"` の場合、符号を反転する。

## エラー処理

- ファイルを開けない場合: 全フィールドNULLでUPDATE（`metadata_extracted_at` は更新される）
- EXIFが存在しない場合: 同上（PNGなどEXIF非対応フォーマット）
- 個別タグが存在しない場合: そのフィールドのみNULL

## プログレスイベント

`commands.rs` から `exif:progress` イベントを発行し、フロントエンドでトースト通知に表示する。

| フィールド | 型 | 説明 |
|-----------|------|------|
| `done` | `usize` | 処理済み件数 |
| `total` | `usize` | 全対象件数 |

## モジュール構成

```
src-tauri/src/exif.rs — EXIF抽出の全処理を担当
```
