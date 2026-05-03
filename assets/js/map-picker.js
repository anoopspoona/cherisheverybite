const HUB = { lat: 8.575357388981113, lon: 76.91238872393365 };

window.initMapPicker = function initMapPicker() {
  const params = new URLSearchParams(window.location.search);
  const returnTo = params.get("return_to") || "calendar.html";
  const plan = params.get("plan") || "elite";
  const meal = params.get("meal") || "lunch";
  const period = params.get("period") || "weekly";
  const pickedLabelParam = params.get("picked_label") || "Pinned Location";

  const useLocation = document.getElementById("use-location");
  const useCurrentLocation = document.getElementById("use-current-location");
  const coords = document.getElementById("coords");
  const pinLabel = document.getElementById("pin-label");
  if (pinLabel) pinLabel.value = pickedLabelParam;

  const carryParams = new URLSearchParams(params);
  carryParams.set("plan", plan);
  carryParams.set("meal", meal);
  carryParams.set("period", period);
  carryParams.delete("return_to");
  carryParams.delete("picked_lat");
  carryParams.delete("picked_lon");
  carryParams.delete("picked_label");

  const baseQuery = carryParams.toString();
  let marker = null;
  let selected = null;

  function updateLinks() {
    if (!selected) return;
    const lat = selected.lat.toFixed(6);
    const lon = selected.lng.toFixed(6);
    const label = encodeURIComponent((pinLabel?.value || "Pinned Location").trim());
    if (coords) coords.textContent = `Selected: ${lat}, ${lon}`;
    if (useLocation) useLocation.href = `${returnTo}?${baseQuery}&picked_lat=${lat}&picked_lon=${lon}&picked_label=${label}`;
  }

  function setSelection(map, latlng) {
    selected = { lat: latlng.lat, lng: latlng.lng };
    if (!marker) {
      marker = new google.maps.Marker({
        position: selected,
        map,
        draggable: true
      });
      marker.addListener("dragend", event => {
        setSelection(map, event.latLng.toJSON());
      });
    } else {
      marker.setPosition(selected);
    }
    map.panTo(selected);
    updateLinks();
  }

  if (!window.google?.maps) {
    if (coords) coords.textContent = "Google Maps did not load. Please check API key.";
    return;
  }

  const map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: HUB.lat, lng: HUB.lon },
    zoom: 13,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true
  });

  map.addListener("click", event => {
    setSelection(map, event.latLng.toJSON());
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
          map.setCenter(latlng);
          map.setZoom(16);
          setSelection(map, latlng);
        },
        () => {
          if (coords) coords.textContent = "Unable to fetch your location. Tap the map to place a pin.";
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    });
  }

  if (pinLabel) pinLabel.addEventListener("input", updateLinks);
};
