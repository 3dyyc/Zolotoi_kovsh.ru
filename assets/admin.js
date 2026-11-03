(() => {
  const config = window.KOVSH_CONFIG || {};
  const $ = id => document.getElementById(id);
  const status = (id, value) => $(id).textContent = value;
  if (!(config.supabaseUrl && config.supabaseAnonKey && window.supabase)) {
    status("loginStatus", "Сначала заполните supabaseUrl и supabaseAnonKey в config.js.");
    return;
  }
  const db = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  async function refresh() {
    const user = await db.auth.getUser();
    if (!user.data.user) return;
    $("loginCard").classList.add("hidden");
    $("dashboard").classList.remove("hidden");
    await Promise.all([loadMedia(), loadBookings()]);
  }

  $("loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    status("loginStatus", "Проверяем данные…");
    const result = await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});
    if (result.error) { status("loginStatus", result.error.message); return; }
    await refresh();
  });

  $("logout").addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });

  async function loadMedia() {
    const result = await db.from("content_items").select("*").order("created_at", {ascending:false});
    if (result.error) { status("mediaStatus", result.error.message); return; }
    const list = $("mediaList");
    list.innerHTML = (result.data || []).map(item =>
      '<article class="item"><img src="' + esc(item.image_url) + '" alt=""><strong>' + esc(item.title) +
      '</strong><small>' + esc(item.category) + '</small><p><button class="danger" data-id="' + item.id +
      '" data-path="' + esc(item.image_path) + '">Удалить</button></p></article>'
    ).join("") || "<p>Материалов пока нет.</p>";
    list.querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => removeItem(button.dataset.id, button.dataset.path)));
  }

  async function removeItem(id, path) {
    if (!confirm("Удалить запись и файл из хранилища?")) return;
    const storage = await db.storage.from("kovsh-media").remove([path]);
    if (storage.error) { status("mediaStatus", storage.error.message); return; }
    const row = await db.from("content_items").delete().eq("id", id);
    if (row.error) { status("mediaStatus", row.error.message); return; }
    await loadMedia();
  }

  $("uploadForm").addEventListener("submit", async event => {
    event.preventDefault();
    const file = $("photoFile").files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { status("uploadStatus", "Файл больше 8 МБ."); return; }
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = Date.now() + "-" + crypto.randomUUID() + "." + ext;
    const button = $("uploadButton");
    button.disabled = true;
    status("uploadStatus", "Загружаем изображение…");
    const upload = await db.storage.from("kovsh-media").upload(path, file, {contentType:file.type,upsert:false});
    if (upload.error) { status("uploadStatus", upload.error.message); button.disabled = false; return; }
    const publicUrl = db.storage.from("kovsh-media").getPublicUrl(path).data.publicUrl;
    const insert = await db.from("content_items").insert({
      title:$("photoTitle").value.trim(), category:$("photoCategory").value,
      description:$("photoDescription").value.trim() || null, image_path:path, image_url:publicUrl
    });
    if (insert.error) {
      await db.storage.from("kovsh-media").remove([path]);
      status("uploadStatus", insert.error.message);
    } else {
      $("uploadForm").reset();
      status("uploadStatus", "Фотография успешно добавлена.");
      await loadMedia();
    }
    button.disabled = false;
  });

  async function loadBookings() {
    const result = await db.from("booking_requests").select("*").order("created_at", {ascending:false}).limit(100);
    if (result.error) { status("bookingStatus", result.error.message); return; }
    $("bookingList").innerHTML = (result.data || []).map(item =>
      '<div class="booking"><strong>' + esc(item.service) + '</strong> · ' + esc(item.customer_name) + ' · ' + esc(item.phone) +
      '<br><small>' + esc(item.desired_date || "Дата не указана") + ' ' + esc(item.desired_time || "") + ' · ' +
      esc(item.guest_count || "") + ' · ' + esc(item.status) + '</small><p>' + esc(item.comment || "") + '</p></div>'
    ).join("") || "<p>Заявок пока нет.</p>";
  }

  db.auth.getSession().then(result => { if (result.data.session) refresh(); });
})();
