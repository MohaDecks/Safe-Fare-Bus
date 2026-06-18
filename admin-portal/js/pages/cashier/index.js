import { state } from "../../core/state.js";
import { api } from "../../core/api.js";
import { formatBirr } from "../../utils/format.js";

export async function renderCashierView(header, content) {
  if (state.view === "dashboard" || state.view === "qr") {
    header.innerHTML =
      state.view === "qr"
        ? `<div><h1>QR — Collect fare</h1><p>Passenger scans this code in the Dirshay Bus mobile app</p></div>`
        : `<div><h1>Cashier dashboard</h1><p>Your bus and today&apos;s collections</p></div>`;

    let bus = null;
    try {
      bus = await api("GET", "/cashier/my-bus");
    } catch (_) {}
    const today = await api("GET", "/cashier/today");
    let qr = null;
    try {
      const q = await api("GET", "/cashier/qr/active");
      if (q && q.token) qr = q;
    } catch (_) {}

    const qrSection =
      state.view === "qr"
        ? `<div class="card qr-card-main">
        <div class="card-header" style="background:linear-gradient(135deg,#1e3a8a,#2563eb);color:#fff;border:none">
          <h2 style="color:#fff">Scan to pay — QR Code</h2>
          <span class="badge" style="background:rgba(255,255,255,0.2);color:#fff">Admin assigned</span>
        </div>
        <div class="card-body qr-panel" style="padding:32px">
        ${
          qr
            ? `<div class="qr-frame">
               <img src="${qr.qr_image || ""}" width="280" height="280" alt="Scan to pay QR code"/>
               </div>
             <p class="qr-fare">${formatBirr(qr.fare_birr)} <span>per trip</span></p>
             <p class="qr-hint">Passenger opens app → <strong>Pay</strong> → scans this QR</p>
             <p class="qr-hint" style="margin-top:8px">${qr.scan_count ?? 0} passengers paid · same QR until admin regenerates</p>
             <p class="qr-token">${qr.token}</p>`
            : `<div class="empty-state" style="padding:40px">
               <p style="font-size:1.1rem;margin-bottom:12px">No QR assigned yet</p>
               <p style="color:var(--muted)">Ask your <strong>admin</strong> to generate QR in Staff portal → <strong>QR Codes</strong>.</p>
               <p style="color:var(--muted);margin-top:8px;font-size:0.85rem">Cashiers cannot create QR themselves.</p></div>`
        }</div></div>`
        : "";

    content.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card success"><label>Today revenue</label><div class="value">${formatBirr(today.revenue_birr)}</div></div>
        <div class="stat-card primary"><label>Today trips</label><div class="value">${today.trips}</div></div>
      </div>
      <div class="card">
        <div class="card-header"><h2>Assigned bus</h2></div>
        <div class="card-body">
        ${
          bus
            ? `<p><strong>${bus.plate}</strong> — ${bus.route_name}<br/>Fare: ${formatBirr(bus.fare_birr)}</p>`
            : `<p class="alert alert-error">No bus assigned. Contact your admin.</p>`
        }
        </div>
      </div>
      ${qrSection}`;
  }
}
