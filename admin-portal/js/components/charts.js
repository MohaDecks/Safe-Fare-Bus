const chartInstances = {};

export function destroyDashboardCharts() {
  Object.keys(chartInstances).forEach((id) => {
    chartInstances[id]?.destroy();
    delete chartInstances[id];
  });
}

function renderDashboardChart(canvasId, type, labels, data, opts) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === "undefined") return;
  chartInstances[canvasId] = new Chart(el, {
    type,
    data: {
      labels,
      datasets: [
        {
          label: opts.label,
          data,
          borderColor: opts.color,
          backgroundColor: opts.bg,
          fill: type === "line",
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          borderRadius: type === "bar" ? 6 : 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#0f172a", padding: 10, cornerRadius: 8 },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "#f1f5f9" },
          ticks: { color: "#64748b", font: { size: 11 } },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
        },
      },
    },
  });
}

export function paintDashboardCharts(charts) {
  if (!charts?.labels) return;
  destroyDashboardCharts();
  renderDashboardChart("chart-revenue", "line", charts.labels, charts.revenue, {
    label: "Revenue (ETB)",
    color: "#B80611",
    bg: "rgba(184, 6, 17, 0.12)",
  });
  renderDashboardChart("chart-customers", "bar", charts.labels, charts.customer_registrations, {
    label: "New customers",
    color: "#7c3aed",
    bg: "rgba(124, 58, 237, 0.35)",
  });
  renderDashboardChart("chart-payments", "bar", charts.labels, charts.payments_count, {
    label: "Fare payments",
    color: "#059669",
    bg: "rgba(5, 150, 105, 0.35)",
  });
}
