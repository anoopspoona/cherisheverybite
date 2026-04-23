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
  const useCurrentLocation = document.getElementById("use-current-location");
  const coords = document.getElementById("coords");
  const pinLabel = document.getElementById("pin-label");

  const baseQuery = `plan=${encodeURIComponent(plan)}&meal=${encodeURIComponent(meal)}&period=${encodeURIComponent(period)}`;
  if (back) back.href = `${returnTo}?${baseQuery}`;

  const map = L.map("map").setView([HUB.lat, HUB.lon], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  let marker = null;
  let selected = null;

  function setSelection(latlng) {
    selected = latlng;
    if (!marker) {
      marker = L.marker(selected).addTo(map);
    } else {
      marker.setLatLng(selected);
    }
    map.panTo(selected);
    updateLinks();
  }

  function updateLinks() {
    if (!selected) return;
    const lat = selected.lat.toFixed(6);
    const lon = selected.lng.toFixed(6);
    const label = encodeURIComponent((pinLabel?.value || "Pinned Location").trim());
    const mapUrl = `https://maps.google.com/?q=${lat},${lon}`;

    if (coords) coords.textContent = `Selected: ${lat}, ${lon}`;
    if (openNative) openNative.href = `geo:${lat},${lon}?q=${lat},${lon}`;
    if (openBrowser) openBrowser.href = mapUrl;
    if (useLocation) useLocation.href = `${returnTo}?${baseQuery}&picked_lat=${lat}&picked_lon=${lon}&picked_label=${label}`;
  }

  map.on("click", event => {
    setSelection(event.latlng);
  });

  if (useCurrentLocation) {
    useCurrentLocation.addEventListener("click", () => {
      if (!navigator.geolocation) {
        if (coords) coords.textContent = "Current location is unavailable in this browser.";
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          const latlng = { lat: position.coords.latitude, lng: position.coords.longitude };
          map.setView([latlng.lat, latlng.lng], 16);
          setSelection(latlng);
        },
        () => {
          if (coords) coords.textContent = "Unable to fetch your location. Tap the map to place a pin.";
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  if (pinLabel) pinLabel.addEventListener("input", updateLinks);
})();
