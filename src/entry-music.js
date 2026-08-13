/**
 * 浏览器打包入口（esbuild 会把它和依赖打成一个文件）
 * Hexo 只需引入 dist/floating-widget-music.js
 */
import { startMusicPlayer } from "./host/music-player-host.js";

// 允许在引入脚本前设置 window.FWF_MUSIC 覆盖默认歌单
startMusicPlayer();
