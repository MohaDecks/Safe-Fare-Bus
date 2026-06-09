import { api } from "../../core/api.js";
import { can } from "../../utils/permissions.js";
import { formatBirr } from "../../utils/format.js";
import { reloadView } from "../../shell/navigation.js";
import { showGenerateQrModal } from "../../modals/index.js";
import { sfError, sfConfirm, sfSuccess } from "../../components/dialog.js";

export async function renderQrcodes(content) {
    const [sessions, buses] = await Promise.all([
      api("GET", "/admin/qr-sessions"),
      api("GET", "/admin/buses"),
    ]);
    content.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h2>Bus fare QR codes</h2>
          ${can("qrcodes.add") ? '<button class="btn btn-primary btn-sm" id="gen-qr">+ Generate QR</button>' : ""}
        </div>
        <p style="padding:0 22px 12px;color:var(--muted);font-size:0.85rem">
          Only <strong>admin</strong> creates QR. Same code works for many passengers until you <strong>Regenerate</strong> or <strong>Delete</strong>.
          Cashier only shows the active QR on their screen.
        </p>
        <div class="card-body table-wrap">
          ${
            sessions.length
              ? `<table><thead><tr><th>Status</th><th>Bus / Route</th><th>Cashier</th><th>Fare</th><th>Scans</th><th>Token</th><th></th></tr></thead><tbody>
              ${sessions
                .map(
                  (s) => `<tr>
                <td>${s.active ? '<span class="badge badge-green">Active</span>' : '<span class="badge">Off</span>'}</td>
                <td><strong>${s.bus_plate}</strong><br/><small>${s.route_name}</small></td>
                <td>${s.cashier_name}<br/><small>${s.cashier_email}</small></td>
                <td>${formatBirr(s.fare_birr)}</td>
                <td>${s.scan_count ?? 0}</td>
                <td><code style="font-size:0.75rem">${s.token}</code></td>
                <td style="white-space:nowrap">
                  <button class="btn btn-secondary btn-sm preview-qr" data-id="${s.id}">View</button>
                  ${s.active && can("qrcodes.update") ? `<button class="btn btn-secondary btn-sm regen-qr" data-id="${s.id}">Regenerate</button>` : ""}
                  ${can("qrcodes.delete") ? `<button class="btn btn-secondary btn-sm del-qr" data-id="${s.id}">Delete</button>` : ""}
                </td></tr>`
                )
                .join("")}</tbody></table>`
              : `<div class="empty-state">No QR yet. Assign cashier to bus → Generate QR.</div>`
          }
        </div>
      </div>
      <div class="card" style="margin-top:20px">
        <div class="card-header"><h2>QR preview</h2></div>
        <div class="card-body qr-panel" id="qr-preview-panel">
          <p style="color:var(--muted)">Click <strong>View</strong> on a row above to show that QR here.</p>
        </div>
      </div>`;
    document.getElementById("gen-qr")?.addEventListener("click", () =>
      showGenerateQrModal(buses, () => reloadView()).catch((e) => sfError(e.message))
    );
    document.querySelectorAll(".regen-qr").forEach((btn) => {
      btn.onclick = async () => {
        if (!(await sfConfirm("Create new QR? Old code stops working.", { danger: true, confirmText: "Regenerate" }))) return;
        await api("POST", `/admin/qr-sessions/${btn.dataset.id}/regenerate`, null, { loadingText: "Regenerating QR…" });
        await sfSuccess("QR code regenerated.", "Done");
        reloadView();
      };
    });
    document.querySelectorAll(".del-qr").forEach((btn) => {
      btn.onclick = async () => {
        if (!(await sfConfirm("Delete (deactivate) this QR?", { danger: true, confirmText: "Delete" }))) return;
        await api("DELETE", `/admin/qr-sessions/${btn.dataset.id}`, null, { loadingText: "Deleting…" });
        await sfSuccess("QR session deleted.", "Deleted");
        reloadView();
      };
    });
    const sessionById = Object.fromEntries(sessions.map((s) => [s.id, s]));

    function renderQrPreview(s) {
      const panel = document.getElementById("qr-preview-panel");
      if (!panel || !s) return;
      const status = s.active
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge">Inactive</span>';
      panel.innerHTML = `
        <div class="qr-frame"><img src="${s.qr_image || ""}" width="220" height="220" alt="QR"/></div>
        <p class="qr-token">${s.token}</p>
        <p style="color:var(--muted);margin-top:8px">
          <strong>${s.bus_plate}</strong> — ${s.route_name || ""}<br/>
          ${s.cashier_name || ""} · ${formatBirr(s.fare_birr)} · ${s.scan_count ?? 0} scans · ${status}
        </p>`;
    }

    if (sessions.length) renderQrPreview(sessions[0]);

    document.querySelectorAll(".preview-qr").forEach((btn) => {
      btn.onclick = () => {
        const s = sessionById[btn.dataset.id];
        if (!s) return;
        renderQrPreview(s);
        document.getElementById("qr-preview-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
    });
}
