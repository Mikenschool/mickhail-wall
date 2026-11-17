"use client";

import { useEffect, useRef, useState } from "react";
import { supabase, BUCKET, MAX_CHARS } from "./supabase";

const MAX_PHOTO_MB = 5;

function timeAgo(iso, now) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "a few seconds ago";
  const m = Math.round(s / 60);
  if (m < 60) return m === 1 ? "about a minute ago" : `${m} minutes ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "about an hour ago" : `${h} hours ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function Avatar({ name, size = 50 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.46 }} aria-hidden="true">
      {initial}
    </div>
  );
}

export default function Wall() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const fileRef = useRef(null);

  // Remember the visitor's name on this device only.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wall-name");
      if (saved) setName(saved);
    } catch {}
  }, []);

  // Load the feed, newest first, then listen for new posts live.
  useEffect(() => {
    let active = true;

    supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setLoadError("The wall couldn't load. Refresh to try again.");
        else setPosts(data);
        setLoading(false);
      });

    const channel = supabase
      .channel("wall-posts")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "posts" }, (payload) => {
        setPosts((list) =>
          list.some((p) => p.id === payload.new.id) ? list : [payload.new, ...list]
        );
      })
      .subscribe();

    const tick = setInterval(() => setNow(Date.now()), 30000);

    return () => {
      active = false;
      supabase.removeChannel(channel);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (!photo) return setPreview("");
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function pickPhoto(e) {
    const f = e.target.files?.[0];
    setFormError("");
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setFormError("That file isn't a photo. Pick a JPG, PNG, GIF or WebP.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_PHOTO_MB * 1024 * 1024) {
      setFormError(`That photo is over ${MAX_PHOTO_MB} MB. Pick a smaller one.`);
      e.target.value = "";
      return;
    }
    setPhoto(f);
  }

  function clearPhoto() {
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function share(e) {
    e.preventDefault();
    const text = body.trim();
    const who = name.trim() || "Guest";
    if (!text && !photo) {
      setFormError("Write something first.");
      return;
    }
    if (text.length > MAX_CHARS) return;

    setSending(true);
    setFormError("");
    try {
      let image_url = null;
      if (photo) {
        const ext = (photo.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from(BUCKET).upload(path, photo, { contentType: photo.type });
        if (up.error) throw up.error;
        image_url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({ name: who.slice(0, 40), body: text, image_url })
        .select()
        .single();
      if (error) throw error;

      setPosts((list) => (list.some((p) => p.id === data.id) ? list : [data, ...list]));
      setBody("");
      clearPhoto();
      try { localStorage.setItem("wall-name", who); } catch {}
    } catch {
      setFormError("Your post didn't save. Check your connection and press Share again.");
    } finally {
      setSending(false);
    }
  }

  const left = MAX_CHARS - body.length;

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <span className="logo">wall</span>
          <span className="topnav">Profile · Friends · Inbox</span>
        </div>
      </header>

      <div className="page">
        <aside className="side">
          <div className="photo" aria-hidden="true">M</div>
          <h2 className="side-h">Information</h2>
          <dl className="info">
            <dt>Networks</dt>
            <dd>De La Salle University</dd>
            <dt>Current City</dt>
            <dd>Manila, Philippines</dd>
            <dt>Built with</dt>
            <dd>React, Next.js, Supabase</dd>
          </dl>
          <p className="side-note">Posts are public. Anyone with the link can read and write.</p>
        </aside>

        <main className="main">
          <h1 className="name">Mickhail Felismino</h1>
          <p className="status-line">is building things on the internet.</p>

          <div className="tabs" role="presentation">
            <span className="tab on">Wall</span>
            <span className="tab">Info</span>
            <span className="tab">Photos</span>
          </div>

          <form className="composer" onSubmit={share}>
            <label htmlFor="msg" className="sr">What's on your mind?</label>
            <textarea
              id="msg"
              placeholder="What's on your mind?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX_CHARS + 50}
              rows={3}
            />
            {preview && (
              <div className="preview">
                <img src={preview} alt="Photo to post" />
                <button type="button" className="link" onClick={clearPhoto}>Remove photo</button>
              </div>
            )}
            <div className="composer-row">
              <label className="namefield">
                <span>Posting as</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  maxLength={40}
                  autoComplete="nickname"
                />
              </label>
              <label className="attach">
                <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} />
                <span>Add photo</span>
              </label>
              <span className={`count${left < 0 ? " over" : left <= 20 ? " near" : ""}`} aria-live="polite">
                {left}
              </span>
              <button type="submit" className="share" disabled={sending || left < 0}>
                {sending ? "Sharing…" : "Share"}
              </button>
            </div>
            {left < 0 && <p className="err">That's {-left} over the {MAX_CHARS}-character limit.</p>}
            {formError && <p className="err" role="alert">{formError}</p>}
          </form>

          <section className="feed" aria-label="Wall posts">
            {loading && <p className="empty">Loading the wall…</p>}
            {loadError && <p className="err">{loadError}</p>}
            {!loading && !loadError && posts.length === 0 && (
              <p className="empty">Nobody has written on this wall yet. Be the first.</p>
            )}
            {posts.map((p) => (
              <article key={p.id} className="post">
                <Avatar name={p.name} />
                <div className="post-body">
                  <p>
                    <strong className="who">{p.name}</strong>{" "}
                    {p.body && <span className="text">{p.body}</span>}
                  </p>
                  {p.image_url && <img className="post-img" src={p.image_url} alt={`Photo posted by ${p.name}`} loading="lazy" />}
                  <time className="when" dateTime={p.created_at}>{timeAgo(p.created_at, now)}</time>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </>
  );
}
