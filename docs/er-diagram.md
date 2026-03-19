```mermaid
erDiagram
    watch_folders {
        TEXT id PK
        TEXT path UK
        INTEGER recursive
        INTEGER created_at
    }

    directories {
        TEXT id PK
        TEXT watch_folder_id FK
        TEXT parent_id FK
        TEXT path UK
        TEXT name
        INTEGER created_at
    }

    photos {
        TEXT id PK
        TEXT directory_id FK
        TEXT file_path UK
        TEXT file_name
        INTEGER file_size
        INTEGER file_modified_at
        INTEGER metadata_extracted_at
        INTEGER thumbnail_generated_at
        TEXT file_hash
        INTEGER width
        INTEGER height
        TEXT taken_at
        INTEGER imported_at
        TEXT camera_make
        TEXT camera_model
        TEXT lens_model
        INTEGER iso
        REAL f_number
        TEXT exposure_time
        REAL focal_length
        REAL focal_length_35mm
        REAL gps_latitude
        REAL gps_longitude
        INTEGER rating
        INTEGER created_at
        INTEGER updated_at
    }

    watch_folders ||--o{ directories : ""
    directories ||--o{ directories : "parent"
    directories ||--o{ photos : ""
```

## 日時の型

- **INTEGER (UNIX TIME)** で統一。フォーマット不一致によるバグを防ぐ。
- 唯一の例外は `taken_at` — EXIFの `DateTimeOriginal` にタイムゾーン情報がないため、TEXTで生データを保存する。
- DB閲覧時は `SELECT datetime(created_at, 'unixepoch') FROM photos` で人間が読める形式に変換できる。
