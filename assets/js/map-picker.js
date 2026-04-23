const HUB = { lat: 8.575357388981113, lon: 76.91238872393365 };

(function init() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("return_to") || "calendar.html";
  const plan = params.get("plan") || "elite";
  const meal = params.get("meal") || "lunch";
  const period = params.get("period") || "weekly";

  const back = document.getElementById("back-calendar");
  const openNative = document.getElementById("open-native");
  const openBrowser = document.getElementById("open-browser");
  const useLocation = document.getElementById("use-location");
  const coords = document.getElementById("coords");
  const pinLabel = document.getElementById("pin-label");

  const baseQuery = `plan=${encodeURIComponent(plan)}&meal=${encodeURIComponent(meal)}&period=${encodeURIComponent(period)}`;
  if (back) back.href = `${returnTo}?${baseQuery}`;

  const map = L.map("map").setView([HUB.lat, HUB.lon], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  let marker = null;
  let selected = null;

  function updateLinks() {
    if (!selected) return;
    const lat = selected.lat.toFixed(6);
    const lon = selected.lon.toFixed(6);
    const label = encodeURIComponent((pinLabel?.value || "Pinned Location").trim());
    const mapUrl = `https://maps.google.com/?q=${lat},${lon}`;

    if (coords) coords.textContent = `Selected: ${lat}, ${lon}`;
    if (openNative) openNative.href = `geo:${lat},${lon}?q=${lat},${lon}`;
    if (openBrowser) openBrowser.href = mapUrl;
    if (useLocation) useLocation.href = `${returnTo}?${baseQuery}&picked_lat=${lat}&picked_lon=${lon}&picked_label=${label}`;
  }

  map.on("click", event => {
    selected = event.latlng;
    if (!marker) {
      marker = L.marker(selected).addTo(map);
    } else {
      marker.setLatLng(selected);
    }
    updateLinks();
  });

  if (pinLabel) pinLabel.addEventListener("input", updateLinks);
})();
