import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { getWardById } from "../../services/locationApi";

const DEFAULT_CENTER = [16.047079, 108.20623];
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const MAX_DISTANCE_FROM_WARD_METERS = 20000;

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function isValidCoordinate(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function haversineDistanceInMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const toRadians = (value) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2))
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadius * c;
}

async function reverseGeocode(lat, lng) {
  const url = `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Không thể lấy địa chỉ từ toạ độ");
  }

  const data = await response.json();
  return data?.display_name || "";
}

function MapClickHandler({ onClickPosition }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng;
      onClickPosition(lat, lng);
    },
  });

  return null;
}

function MapRecenter({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (Array.isArray(center) && center.length === 2) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);

  return null;
}

function LocationMapPicker({
  title,
  value,
  onChange,
  wardId = "",
  accentClass = "border-slate-200 bg-white",
  hint = "Chạm lên bản đồ để chọn vị trí chính xác",
}) {
  const [wardCenter, setWardCenter] = useState(null);
  const [isLoadingWardCenter, setIsLoadingWardCenter] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [localError, setLocalError] = useState("");

  const lat = Number(value?.lat);
  const lng = Number(value?.lng);
  const hasCoordinate = isValidCoordinate(lat, lng);

  useEffect(() => {
    let isCancelled = false;

    const loadWardCenter = async () => {
      if (!wardId) {
        setWardCenter(null);
        return;
      }

      try {
        setIsLoadingWardCenter(true);
        const ward = await getWardById(wardId);
        const wardLat = Number(ward?.lat);
        const wardLng = Number(ward?.lng);
        if (!isCancelled) {
          setWardCenter(isValidCoordinate(wardLat, wardLng) ? [wardLat, wardLng] : null);
        }
      } catch (_error) {
        if (!isCancelled) {
          setWardCenter(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingWardCenter(false);
        }
      }
    };

    loadWardCenter();

    return () => {
      isCancelled = true;
    };
  }, [wardId]);

  useEffect(() => {
    if (!hasCoordinate || !wardCenter) {
      return;
    }

    const distance = haversineDistanceInMeters(lat, lng, wardCenter[0], wardCenter[1]);
    if (distance > MAX_DISTANCE_FROM_WARD_METERS) {
      onChange({
        lat: Number.NaN,
        lng: Number.NaN,
        addressText: value?.addressText || "",
      });
      setLocalError("Vi tri dang chon nam ngoai ban kinh 20km tu tam phuong/xa. Vui long chon lai.");
    }
  }, [hasCoordinate, lat, lng, onChange, value?.addressText, wardCenter]);

  const center = useMemo(() => {
    if (hasCoordinate) {
      return [lat, lng];
    }

    if (wardCenter) {
      return wardCenter;
    }

    return DEFAULT_CENTER;
  }, [hasCoordinate, lat, lng, wardCenter]);

  const mapZoom = hasCoordinate ? 15 : wardCenter ? 13 : 12;
  const distanceFromWardCenter = useMemo(() => {
    if (!hasCoordinate || !wardCenter) {
      return null;
    }

    return haversineDistanceInMeters(lat, lng, wardCenter[0], wardCenter[1]);
  }, [hasCoordinate, lat, lng, wardCenter]);

  const updateLocation = (next) => {
    setLocalError("");
    onChange({
      lat: next.lat,
      lng: next.lng,
      addressText: next.addressText ?? value?.addressText ?? "",
    });
  };

  const updateFromCoordinate = async (nextLat, nextLng) => {
    if (wardCenter) {
      const distance = haversineDistanceInMeters(nextLat, nextLng, wardCenter[0], wardCenter[1]);
      if (distance > MAX_DISTANCE_FROM_WARD_METERS) {
        setLocalError("Diem chon nam ngoai ban kinh 20km tu tam phuong/xa. Vui long chon diem khac.");
        return;
      }
    }

    if (!isValidCoordinate(nextLat, nextLng)) {
      setLocalError("Toa do khong hop le. Vui long chon lai.");
      return;
    }

    updateLocation({ lat: nextLat, lng: nextLng });

    try {
      setIsResolvingAddress(true);
      const reverseAddress = await reverseGeocode(nextLat, nextLng);
      if (reverseAddress) {
        updateLocation({ lat: nextLat, lng: nextLng, addressText: reverseAddress });
      }
    } catch (_error) {
      setLocalError("Không lấy được địa chỉ tự động. Bạn có thể tự nhập địa chỉ chi tiết.");
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocalError("Trình duyệt không hỗ trợ định vị vị trí hiện tại");
      return;
    }

    setLocalError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateFromCoordinate(position.coords.latitude, position.coords.longitude);
      },
      () => {
        setLocalError("Không thể lấy vị trí hiện tại. Hãy kiểm tra quyền truy cập vị trí.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <section className={`rounded-xl border p-3 ${accentClass}`}>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-800">{title}</h4>
        <button
          type="button"
          onClick={useCurrentLocation}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Dùng vị trí hiện tại
        </button>
      </div>

      <p className="mt-1 text-xs text-slate-500">{hint}</p>

      <div className="mt-2.5 overflow-hidden rounded-lg border border-slate-200">
        <MapContainer center={center} zoom={mapZoom} className="h-52 w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {wardCenter ? (
            <Circle
              center={wardCenter}
              radius={MAX_DISTANCE_FROM_WARD_METERS}
              pathOptions={{ color: "#0ea5e9", weight: 2, fillColor: "#7dd3fc", fillOpacity: 0.12 }}
            />
          ) : null}
          <MapClickHandler onClickPosition={updateFromCoordinate} />
          <MapRecenter center={center} zoom={mapZoom} />
          {hasCoordinate ? <Marker position={[lat, lng]} icon={markerIcon} /> : null}
        </MapContainer>
      </div>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Lat:</span> {hasCoordinate ? lat.toFixed(6) : "Chưa chọn"}
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-600">
          <span className="font-semibold text-slate-700">Lng:</span> {hasCoordinate ? lng.toFixed(6) : "Chưa chọn"}
        </div>
      </div>

      <label className="mt-2.5 block text-xs font-semibold text-slate-700" htmlFor={`${title}-address`}>
        Địa chỉ chi tiết
      </label>
      <input
        id={`${title}-address`}
        type="text"
        value={value?.addressText || ""}
        onChange={(event) => updateLocation({ lat, lng, addressText: event.target.value })}
        placeholder="So nha, ten duong, moc de nhan dien..."
        className="mt-1 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />

      {isLoadingWardCenter ? <p className="mt-1 text-xs text-slate-500">Dang tai tam phuong/xa de khoanh vung 20km...</p> : null}
      {!wardCenter && wardId ? (
        <p className="mt-1 text-xs text-amber-700">Khong lay duoc tam phuong/xa tu he thong. Ban van co the chon map khong gioi han ban kinh.</p>
      ) : null}
      {distanceFromWardCenter !== null ? (
        <p className="mt-1 text-xs text-slate-500">
          Khoang cach den tam phuong/xa: {(distanceFromWardCenter / 1000).toFixed(2)} km (toi da {(MAX_DISTANCE_FROM_WARD_METERS / 1000).toFixed(0)} km)
        </p>
      ) : null}
      {isResolvingAddress ? <p className="mt-1 text-xs text-slate-500">Dang cap nhat dia chi tu vi tri map...</p> : null}
      {localError ? <p className="mt-1 text-xs text-red-600">{localError}</p> : null}
    </section>
  );
}

export { isValidCoordinate };
export default LocationMapPicker;
