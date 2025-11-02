// likes.js - local like storage helpers

const STORAGE_KEY = 'likedQuotes_v1';

export function getLikedIds() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export function isLiked(id) {
  return getLikedIds().includes(String(id));
}

export function addLikeLocal(id) {
  const likes = new Set(getLikedIds().map(String));
  likes.add(String(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...likes]));
}

export function removeLikeLocal(id) {
  const likes = getLikedIds().map(String).filter(value => value !== String(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
}

export function setLikedIds(ids) {
  const normalised = Array.from(new Set((ids ?? []).map(String)));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalised));
}
