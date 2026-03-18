import { useState } from "react";
import {
  addWatchFolder,
  extractExif,
  fetchPhotos,
  fetchWatchFolders,
  scanAllWatchFolders,
  scanFolder,
  type Photo,
  type WatchFolder,
} from "./lib/commands";

function App() {
  const [folderPath, setFolderPath] = useState("");
  const [watchFolders, setWatchFolders] = useState<WatchFolder[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [log, setLog] = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString("ja-JP")}] ${msg}`]);
  }

  async function handleAddFolder() {
    if (!folderPath.trim()) return;
    try {
      const id = await addWatchFolder(folderPath.trim());
      addLog(`watch_folder登録: ${folderPath}`);
      const count = await scanFolder(id, folderPath.trim());
      addLog(`スキャン完了: ${count}件`);
      setFolderPath("");
      await handleLoadFolders();
    } catch (e) {
      addLog(`エラー: ${e}`);
    }
  }

  async function handleScanAll() {
    try {
      const count = await scanAllWatchFolders();
      addLog(`全フォルダスキャン完了: ${count}件`);
    } catch (e) {
      addLog(`エラー: ${e}`);
    }
  }

  async function handleExtractExif() {
    try {
      const count = await extractExif();
      addLog(`EXIF抽出完了: ${count}件`);
    } catch (e) {
      addLog(`エラー: ${e}`);
    }
  }

  async function handleLoadFolders() {
    try {
      const folders = await fetchWatchFolders();
      setWatchFolders(folders);
    } catch (e) {
      addLog(`エラー: ${e}`);
    }
  }

  async function handleLoadPhotos() {
    try {
      const result = await fetchPhotos();
      setPhotos(result);
      addLog(`写真一覧取得: ${result.length}件`);
    } catch (e) {
      addLog(`エラー: ${e}`);
    }
  }

  return (
    <main style={{ fontFamily: "monospace", padding: 16, maxWidth: 900 }}>
      <h1>Photo Manager — 動作確認UI</h1>

      {/* watch_folder追加 */}
      <section>
        <h2>フォルダ追加</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ flex: 1, padding: 4 }}
            type="text"
            placeholder="フォルダパス（例: C:/Photos）"
            value={folderPath}
            onChange={(e) => setFolderPath(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddFolder()}
          />
          <button onClick={handleAddFolder}>登録 + スキャン</button>
        </div>
      </section>

      {/* 操作ボタン */}
      <section style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <button onClick={handleScanAll}>全フォルダ再スキャン</button>
        <button onClick={handleExtractExif}>EXIF抽出</button>
        <button onClick={handleLoadFolders}>watch_folder一覧</button>
        <button onClick={handleLoadPhotos}>写真一覧取得</button>
      </section>

      {/* watch_folder一覧 */}
      {watchFolders.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2>watch_folders</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th>path</th>
                <th>recursive</th>
                <th>created_at</th>
              </tr>
            </thead>
            <tbody>
              {watchFolders.map((f) => (
                <tr key={f.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{f.path}</td>
                  <td>{f.recursive ? "yes" : "no"}</td>
                  <td>{f.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 写真一覧 */}
      {photos.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2>photos ({photos.length}件)</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
                <th>ファイル名</th>
                <th>撮影日時</th>
                <th>カメラ</th>
                <th>ISO</th>
                <th>F値</th>
                <th>露出</th>
                <th>焦点距離</th>
                <th>EXIF抽出済</th>
              </tr>
            </thead>
            <tbody>
              {photos.map((p) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td>{p.file_name}</td>
                  <td>{p.taken_at ?? "—"}</td>
                  <td>{[p.camera_make, p.camera_model].filter(Boolean).join(" ") || "—"}</td>
                  <td>{p.iso ?? "—"}</td>
                  <td>{p.f_number ?? "—"}</td>
                  <td>{p.exposure_time ?? "—"}</td>
                  <td>
                    {p.focal_length ? `${p.focal_length}mm` : "—"}
                    {p.focal_length_35mm ? ` (35mm換算: ${p.focal_length_35mm}mm)` : ""}
                  </td>
                  <td>{p.metadata_extracted_at ? "✓" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ログ */}
      <section style={{ marginTop: 16 }}>
        <h2>ログ</h2>
        <div
          style={{
            background: "#111",
            color: "#0f0",
            padding: 8,
            fontSize: 12,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {log.length === 0 ? (
            <div>（操作ログがここに表示されます）</div>
          ) : (
            log.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
