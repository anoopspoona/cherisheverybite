function parseCSVLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out.map(v => v.trim());
}

function parseCSV(text) {
  const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const cols = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    return row;
  });
}

function serializeCSV(rows) {
  const data = Array.isArray(rows) ? rows : [];
  if (!data.length) return "";
  const headers = Object.keys(data[0]);
  const escapeValue = value => {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  };
  const lines = [headers.map(escapeValue).join(",")];
  data.forEach(row => {
    lines.push(headers.map(header => escapeValue(row[header])).join(","));
  });
  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWhatsappLink(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

async function fetchCSV(path) {
  const overrides = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("ceb_csv_overrides_v1") || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  })();
  const overrideText = overrides[path];
  if (typeof overrideText === "string" && overrideText.trim()) {
    return parseCSV(overrideText);
  }
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} not found`);
  return parseCSV(await response.text());
}

window.cebCsvTools = {
  parseCSV,
  serializeCSV,
  readOverrides() {
    try {
      const parsed = JSON.parse(localStorage.getItem("ceb_csv_overrides_v1") || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  },
  writeOverride(path, text) {
    const current = this.readOverrides();
    current[path] = String(text || "");
    localStorage.setItem("ceb_csv_overrides_v1", JSON.stringify(current));
  },
  clearOverride(path) {
    const current = this.readOverrides();
    delete current[path];
    localStorage.setItem("ceb_csv_overrides_v1", JSON.stringify(current));
  }
};
