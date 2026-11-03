(() => {
  const cfg = window.KOVSH_CONFIG || {};
  const ready = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase);
  const db = ready ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  async function loadGallery() {
    if (!db) return;
    const result = await db.from("content_items").select("*").eq("is_active", true).order("sort_order").order("created_at", {ascending:false});
    if (result.error || !result.data || !result.data.length) return;
    const grid = document.getElementById("galleryGrid");
    if (!grid) return;
    grid.innerHTML = result.data.map(item =>
      '<a href="' + esc(item.image_url) + '" target="_blank" rel="noreferrer"><img src="' + esc(item.image_url) + '" alt="' + esc(item.title) + '" loading="lazy"><span>' + esc(item.title) + '</span></a>'
    ).join("");
  }

  async function submitBooking(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const value = id => document.getElementById(id).value.trim();
    const payload = {
      service:value("kind"), guest_count:value("people"), desired_date:value("date") || null,
      desired_time:value("time") || null, customer_name:value("name"), phone:value("phone"),
      comment:value("comment") || null
    };
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = "Отправляем…";
    if (db) {
      const result = await db.from("booking_requests").insert(payload);
      if (!result.error) {
        alert("Спасибо! Заявка отправлена администрации. Бронирование будет подтверждено отдельно.");
        event.currentTarget.reset();
        button.disabled = false;
        button.textContent = "Отправить заявку";
        return;
      }
      console.error("Booking insert failed:", result.error);
    }
    const message = [
      "Здравствуйте! Хочу уточнить бронирование в комплексе «Золотой ковш».",
      "Услуга: " + payload.service, "Количество гостей: " + payload.guest_count,
      "Дата: " + (payload.desired_date || "не указана"), "Время: " + (payload.desired_time || "не указано"),
      "Имя: " + payload.customer_name, "Телефон: " + payload.phone,
      "Комментарий: " + (payload.comment || "нет")
    ].join("\n");
    window.open("https://wa.me/79142717283?text=" + encodeURIComponent(message), "_blank", "noopener");
    button.disabled = false;
    button.textContent = "Отправить заявку в WhatsApp";
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadGallery();
    const form = document.getElementById("bookingForm");
    if (form) form.addEventListener("submit", submitBooking);
  });
})();
