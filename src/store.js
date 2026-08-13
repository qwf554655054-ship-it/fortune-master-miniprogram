'use strict';
/**
 * 轻量用户存储层（本地 JSON 文件）
 * 按 clientId 保存 历史记录 与 收藏，无鉴权（供单机演示/内测）。
 * 数据目录 data/ 已在 .gitignore 中，不会提交。
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DATA_DIR, 'user.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch (e) { return {}; }
}
function save(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}
function clientOf(clientId) {
  const db = load();
  if (!db[clientId]) db[clientId] = { history: [], favorites: [] };
  return db;
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function listHistory(clientId) {
  return (clientOf(clientId)[clientId] || {}).history || [];
}
function addHistory(clientId, entry) {
  const db = clientOf(clientId);
  const item = {
    id: uid(),
    system: entry.system || '',
    title: entry.title || '',
    summary: entry.summary || '',
    params: entry.params || {},
    createdAt: new Date().toISOString(),
  };
  db[clientId].history.unshift(item);
  if (db[clientId].history.length > 50) db[clientId].history = db[clientId].history.slice(0, 50);
  save(db);
  return item;
}
function deleteHistory(clientId, id) {
  const db = clientOf(clientId);
  db[clientId].history = db[clientId].history.filter((h) => h.id !== id);
  save(db);
  return true;
}

function listFavorites(clientId) {
  return (clientOf(clientId)[clientId] || {}).favorites || [];
}
function addFavorite(clientId, entry) {
  const db = clientOf(clientId);
  const item = {
    id: uid(),
    system: entry.system || '',
    title: entry.title || '',
    summary: entry.summary || '',
    createdAt: new Date().toISOString(),
  };
  db[clientId].favorites.unshift(item);
  save(db);
  return item;
}
function deleteFavorite(clientId, id) {
  const db = clientOf(clientId);
  db[clientId].favorites = db[clientId].favorites.filter((f) => f.id !== id);
  save(db);
  return true;
}

module.exports = { listHistory, addHistory, deleteHistory, listFavorites, addFavorite, deleteFavorite };
