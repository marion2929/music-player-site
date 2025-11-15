// @ts-nocheck
"use client";

import { useState, useRef } from "react";
import { tracks } from "./tracks-data";

export default function HomePage() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0〜100%
  const [currentTime, setCurrentTime] = useState(0); // 秒
  const [totalTime, setTotalTime] = useState(0); // 秒
  const [filter, setFilter] = useState<
    "all" | "short" | "long" | "english" | "inst"
  >("all");

  // 連続再生系
  const [isContinuous, setIsContinuous] = useState(false); // 種類連続
  const [repeatOne, setRepeatOne] = useState(false); // 1曲リピート
  const [usePlaylistLoop, setUsePlaylistLoop] = useState(false); // プレイリスト連続
  const [shuffle, setShuffle] = useState(false); // シャッフル

  // プレイリスト（Track の id）
  const [playlistIds, setPlaylistIds] = useState<number[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // フィルタ済みリスト（表示中の種類）
  const filteredTracks =
    filter === "all" ? tracks : tracks.filter((t) => t.type === filter);

  // プレイリスト実体
  const playlistTracks = tracks.filter((t) => playlistIds.includes(t.id));

  // 秒 → "M:SS"
  const formatTime = (sec: number) => {
    if (!sec || isNaN(sec)) return "0:00";
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  // 配列からランダムに1つ選ぶ
  const pickRandom = (list: typeof tracks, exceptId?: number) => {
    if (!list.length) return null;
    const candidates =
      typeof exceptId === "number"
        ? list.filter((t) => t.id !== exceptId) || list
        : list;
    const idx = Math.floor(Math.random() * candidates.length);
    return candidates[idx];
  };

  // プレイリストの追加/削除
  const togglePlaylist = (trackId: number) => {
    setPlaylistIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId]
    );
  };

  // 再生処理
  const playTrack = (track) => {
    if (!track) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(track.src);
    audioRef.current = audio;

    audio.play();
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    setTotalTime(0);
    setProgress(0);

    audio.ontimeupdate = () => {
      const current = audio.currentTime;
      const total = audio.duration;
      setCurrentTime(current);
      setTotalTime(total);
      const value = (current / total) * 100;
      setProgress(isNaN(value) ? 0 : value);
    };

    audio.onended = () => {
      setCurrentTime(0);
      setProgress(0);

      // 1曲リピート 最優先
      if (repeatOne) {
        audio.currentTime = 0;
        audio.play();
        return;
      }

      let next: (typeof tracks)[number] | null = null;

      if (usePlaylistLoop && playlistTracks.length > 0) {
        // 🎵 プレイリスト連続
        if (shuffle) {
          next = pickRandom(playlistTracks, track.id);
        } else {
          const idx = playlistTracks.findIndex((t) => t.id === track.id);
          const nextIdx = idx === -1 ? 0 : (idx + 1) % playlistTracks.length;
          next = playlistTracks[nextIdx];
        }
      } else if (isContinuous) {
        // 🎵 種類連続（type ごと）
        const sameTypeList = tracks.filter((t) => t.type === track.type);
        if (sameTypeList.length > 0) {
          if (shuffle) {
            next = pickRandom(sameTypeList, track.id);
          } else {
            const index = sameTypeList.findIndex((t) => t.id === track.id);
            const nextIdx = (index + 1) % sameTypeList.length;
            next = sameTypeList[nextIdx];
          }
        }
      } else if (shuffle) {
        // 🎵 シャッフルのみON → 「表示中の種類」からランダム
        const shuffleList = filteredTracks;
        next = pickRandom(shuffleList as any, track.id);
      }

      if (next) {
        playTrack(next);
        return;
      }

      setIsPlaying(false);
    };
  };

  // 一時停止 / 再開 / シーク
  const pauseTrack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const resumeTrack = () => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e) => {
    const value = Number(e.target.value);
    if (audioRef.current && !isNaN(value)) {
      const newTime = (audioRef.current.duration * value) / 100;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
      setProgress(value);
    }
  };

  // プレイヤー側から呼ぶ安全版
  const safeResume = () => {
    if (!currentTrack || !audioRef.current) return;
    resumeTrack();
  };
  const safePause = () => {
    if (!currentTrack || !audioRef.current) return;
    pauseTrack();
  };
  const safeStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };

  // タイプごとにバッジ色を変える
  const typeColor = (type: string) => {
    switch (type) {
      case "short":
        return "#d6e4ff";
      case "long":
        return "#ffe0e6";
      case "english":
        return "#e0ffe7";
      case "inst":
        return "#fff3cd";
      default:
        return "#e3e6f0";
    }
  };

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI'",
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f5f7ff 0%, #fdfbff 40%, #f6fbff 100%)",
      }}
    >
      {/* ===== 上部固定プレイヤー ===== */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(90deg, #6b8bff 0%, #9f6bff 40%, #ff7eb3 100%)",
            color: "#fff",
            padding: "10px 18px 14px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
          }}
        >
          {/* 上段：タイトル＆状態 */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                fontWeight: "bold",
                fontSize: "15px",
                minHeight: "20px",
              }}
            >
              🎧{" "}
              {currentTrack ? currentTrack.title : "再生する曲を選んでください"}
            </div>
            <div style={{ fontSize: "11px", opacity: 0.9 }}>
              {isPlaying ? "▶ 再生中" : "⏹ 停止中"}
            </div>
          </div>

          {/* 時間表示 */}
          <div
            style={{
              fontSize: "12px",
              textAlign: "right",
              marginBottom: "4px",
              opacity: 0.9,
            }}
          >
            {formatTime(currentTime)} / {formatTime(totalTime)}
          </div>

          {/* シークバー */}
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleSeek}
            style={{
              width: "100%",
              marginBottom: "8px",
              accentColor: "#ffffff",
            }}
          />

          {/* 再生系ボタン */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {!isPlaying ? (
              <button onClick={safeResume} style={playerBtnWhite}>
                ▶ 再生
              </button>
            ) : (
              <button onClick={safePause} style={playerBtnWhite}>
                ⏸ 一時停止
              </button>
            )}

            <button onClick={safeStop} style={playerBtnWhite}>
              ⏹ 停止
            </button>

            {/* モードボタン群 */}
            <button
              onClick={() => setIsContinuous((prev) => !prev)}
              style={{
                ...toggleChip,
                background: isContinuous
                  ? "rgba(33, 214, 123, 0.9)"
                  : "rgba(255,255,255,0.15)",
              }}
            >
              種類連続{isContinuous ? "：ON" : "：OFF"}
            </button>

            <button
              onClick={() => setUsePlaylistLoop((prev) => !prev)}
              style={{
                ...toggleChip,
                background: usePlaylistLoop
                  ? "rgba(149, 117, 255, 0.95)"
                  : "rgba(255,255,255,0.15)",
              }}
            >
              PL連続{usePlaylistLoop ? "：ON" : "：OFF"}
            </button>

            <button
              onClick={() => setShuffle((prev) => !prev)}
              style={{
                ...toggleChip,
                background: shuffle
                  ? "rgba(255, 193, 7, 0.95)"
                  : "rgba(255,255,255,0.15)",
              }}
            >
              シャッフル{shuffle ? "：ON" : "：OFF"}
            </button>

            <button
              onClick={() => setRepeatOne((prev) => !prev)}
              style={{
                ...toggleChip,
                background: repeatOne
                  ? "rgba(255, 87, 34, 0.95)"
                  : "rgba(255,255,255,0.15)",
              }}
            >
              1曲リピート{repeatOne ? "：ON" : "：OFF"}
            </button>

            <span style={{ fontSize: "11px", opacity: 0.9 }}>
              🎵 PL: {playlistTracks.length} 曲
            </span>
          </div>
        </div>
      </div>

      {/* ===== メインコンテンツ（スクロール部分） ===== */}
      <div
        style={{
          padding: "20px",
          paddingTop: "170px",
          paddingBottom: "40px",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "bold",
            marginBottom: "10px",
            color: "#333",
          }}
        >
          My Music Library
        </h1>

        <p
          style={{
            fontSize: "13px",
            color: "#555",
            marginBottom: "16px",
          }}
        >
          Short：TikTok 用のショートネタ曲 / Long：歌詞付きフルバージョン /
          English：英語曲 / Inst：インストピアノなど。
          好きな曲をプレイリストに入れて、PL連続＋シャッフルで流しっぱなしもできます。
        </p>

        {/* フィルターボタン */}
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "14px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setFilter("all")}
            style={filterButton(filter === "all")}
          >
            ALL
          </button>
          <button
            onClick={() => setFilter("short")}
            style={filterButton(filter === "short")}
          >
            SHORT
          </button>
          <button
            onClick={() => setFilter("long")}
            style={filterButton(filter === "long")}
          >
            LONG
          </button>
          <button
            onClick={() => setFilter("english")}
            style={filterButton(filter === "english")}
          >
            ENGLISH
          </button>
          <button
            onClick={() => setFilter("inst")}
            style={filterButton(filter === "inst")}
          >
            INST
          </button>
        </div>

        {/* 曲リスト */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {filteredTracks.map((track) => {
            const tags = Array.isArray(track.tags) ? track.tags : [];
            const inPlaylist = playlistIds.includes(track.id);

            return (
              <div
                key={track.id}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "#ffffff",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                  border:
                    currentTrack && currentTrack.id === track.id
                      ? "2px solid #6b8bff"
                      : "1px solid #e3e6f0",
                  cursor: "pointer",
                  transition: "transform 0.08s ease, box-shadow 0.08s ease",
                }}
                onClick={() => playTrack(track)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(-1px)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 4px 10px rgba(0,0,0,0.10)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(0)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    "0 2px 4px rgba(0,0,0,0.06)";
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      backgroundColor: typeColor(track.type),
                      color: "#333",
                      padding: "3px 8px",
                      borderRadius: "999px",
                      minWidth: "60px",
                      textAlign: "center",
                      textTransform: "uppercase",
                    }}
                  >
                    {track.type}
                  </span>

                  <span
                    style={{
                      fontSize: "15px",
                      flex: 1,
                      color: "#222",
                    }}
                  >
                    {track.title}
                  </span>

                  {/* プレイリストボタン */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlaylist(track.id);
                    }}
                    style={{
                      fontSize: "11px",
                      padding: "4px 8px",
                      borderRadius: "999px",
                      border: "1px solid #888",
                      background: inPlaylist ? "#ffe082" : "#f5f5f5",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {inPlaylist ? "− PL" : "＋ PL"}
                  </button>
                </div>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#555",
                    marginLeft: "70px",
                  }}
                >
                  ⏱ {track.duration || "0:00"}　
                  {tags.length > 0 && <span>🎵 {tags.join(" / ")}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const filterButton = (active: boolean) => ({
  padding: "6px 14px",
  borderRadius: "999px",
  border: "none",
  background: active ? "#6b8bff" : "#e3e6ff",
  color: active ? "#fff" : "#333",
  cursor: "pointer",
  fontWeight: active ? "bold" : "normal",
  fontSize: "13px",
});

const playerBtnWhite = {
  background: "#ffffff",
  color: "#333",
  padding: "6px 12px",
  borderRadius: "999px",
  border: "none",
  fontSize: "13px",
  cursor: "pointer",
} as const;

const toggleChip = {
  padding: "5px 10px",
  borderRadius: "999px",
  border: "none",
  fontSize: "11px",
  color: "#fff",
  cursor: "pointer",
  backdropFilter: "blur(4px)",
} as const;
