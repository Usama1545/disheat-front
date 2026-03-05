"use client";
import { FC, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DeliveryLocationResponse } from "@/types/ApiResponse";
import { TILE_LAYERS } from "@/config/constants";

interface OpenStreetMapTrackingProps {
  data: DeliveryLocationResponse | null;
  isLoading?: boolean;
  useTransportLayer: boolean;
}

const key = "64acfb2cb7254afd95277f9865cd835e";

// Decode polyline from OSRM
const decodePolyline = (encoded: string): [number, number][] => {
  const points: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push([lat / 100000, lng / 100000]);
  }

  return points;
};

// Get route from OSRM
const getRoadRoute = async (
  start: [number, number],
  end: [number, number]
): Promise<[number, number][]> => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=polyline`;
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      const route = data.routes[0].geometry;
      return decodePolyline(route);
    }
  } catch (error) {
    console.error("Error fetching route:", error);
  }
  return [];
};

const createCustomIcon = (
  color: string,
  iconText: string,
  iconType: "rider" | "store" | "customer" = "store"
) => {
  const size = iconType === "rider" ? 40 : iconType === "customer" ? 35 : 32;
  const iconHtml = `
    <div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    ">
      <div style="
        transform: rotate(45deg);
        color: white;
        font-weight: bold;
        font-size: ${iconType === "rider" ? "18px" : iconType === "customer" ? "20px" : "14px"};
        text-align: center;
      ">${iconText}</div>
    </div>
  `;

  return L.divIcon({
    html: iconHtml,
    className: "custom-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const OpenStreetMapTracking: FC<OpenStreetMapTrackingProps> = ({
  data,
  isLoading = false,
  useTransportLayer = false,
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polylinesRef = useRef<L.Polyline[]>([]);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);

  useEffect(() => {
    if (!mapContainerRef.current || !data) return;

    const initializeMap = async () => {
      setIsMapLoading(true);

      try {
        // Initialize map if not already initialized
        if (!mapRef.current) {
          const customerLat = parseFloat(data.order.shipping_latitude);
          const customerLng = parseFloat(data.order.shipping_longitude);

          mapRef.current = L.map(mapContainerRef.current!, {
            center: [customerLat, customerLng],
            zoom: 13,
            zoomControl: true,
          });
        }

        const map = mapRef.current;
        if (!map) return;

        // Remove existing tile layer if it exists
        if (tileLayerRef.current) {
          tileLayerRef.current.remove();
        }

        // Add tile layer based on useTransportLayer prop
        if (useTransportLayer) {
          tileLayerRef.current = L.tileLayer(
            `https://{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=${key}`,
            {
              attribution:
                'Maps &copy; <a href="https://www.thunderforest.com">Thunderforest</a>, Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 22,
            }
          ).addTo(map);
        } else {
          tileLayerRef.current = L.tileLayer(TILE_LAYERS[2], {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          }).addTo(map);
        }

        // Clear existing markers and polylines
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
        polylinesRef.current.forEach((polyline) => polyline.remove());
        polylinesRef.current = [];

        // Extract locations
        const deliveryBoyLocation = data.delivery_boy.data;
        const riderLat = parseFloat(deliveryBoyLocation.latitude);
        const riderLng = parseFloat(deliveryBoyLocation.longitude);

        const customerLat = parseFloat(data.order.shipping_latitude);
        const customerLng = parseFloat(data.order.shipping_longitude);

        const routeDetails = data.route.route_details;
        const stores = routeDetails.filter((store) => store.store_id !== null);
        const customerLocation = routeDetails.find(
          (loc) => loc.store_id === null
        );

        // Build route segments
        const waypoints: [number, number][] = [];

        // Start with rider location
        waypoints.push([riderLat, riderLng]);

        // Add all stores in order
        stores.forEach((store) => {
          waypoints.push([store.latitude, store.longitude]);
        });

        // End with customer location
        if (customerLocation) {
          waypoints.push([
            customerLocation.latitude,
            customerLocation.longitude,
          ]);
        } else {
          waypoints.push([customerLat, customerLng]);
        }

        // Fetch all routes in parallel for better performance
        const routePromises = [];
        for (let i = 0; i < waypoints.length - 1; i++) {
          routePromises.push(getRoadRoute(waypoints[i], waypoints[i + 1]));
        }

        const routeSegments = await Promise.all(routePromises);

        // Combine all route segments
        const allRoutePoints: [number, number][] = [];
        routeSegments.forEach((routeSegment, index) => {
          if (routeSegment.length > 0) {
            // Avoid duplicating the connecting point
            if (allRoutePoints.length > 0) {
              allRoutePoints.push(...routeSegment.slice(1));
            } else {
              allRoutePoints.push(...routeSegment);
            }
          } else {
            // Fallback to straight line if routing fails
            allRoutePoints.push(waypoints[index + 1]);
          }
        });

        // Create polyline for the route
        if (allRoutePoints.length > 0) {
          const routePolyline = L.polyline(allRoutePoints, {
            color: "#3B82F6",
            weight: 4,
            opacity: 0.8,
            smoothFactor: 1,
          }).addTo(map);

          polylinesRef.current.push(routePolyline);
        }

        // Create rider marker
        const riderMarker = L.marker([riderLat, riderLng], {
          icon: createCustomIcon("#10B981", "🏍️", "rider"),
        }).addTo(map);

        riderMarker.bindPopup(`
          <div style="min-width: 200px; padding: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 8px; height: 8px; background-color: #10B981; border-radius: 50%;"></div>
              <strong style="color: #1f2937;">Delivery Partner</strong>
            </div>
            <p style="margin: 0; font-weight: 500; color: #111827;">${deliveryBoyLocation.delivery_boy.full_name}</p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280; text-transform: capitalize;">${deliveryBoyLocation.delivery_boy.vehicle_type}</p>
          </div>
        `);

        markersRef.current.push(riderMarker);

        // Create store markers
        stores.forEach((store, index) => {
          const storeMarker = L.marker([store.latitude, store.longitude], {
            icon: createCustomIcon("#3B82F6", `${index + 1}`, "store"),
          }).addTo(map);

          const distanceText = store.distance_from_customer
            ? `${store.distance_from_customer.toFixed(2)} km from customer`
            : store.distance_from_previous
              ? `${store.distance_from_previous.toFixed(2)} km from previous`
              : "";

          storeMarker.bindPopup(`
            <div style="min-width: 220px; padding: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <div style="width: 24px; height: 24px; background-color: #3B82F6; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
                  ${index + 1}
                </div>
                <strong style="color: #1f2937;">Store ${index + 1}</strong>
              </div>
              <p style="margin: 0; font-weight: 500; color: #111827;">${store.store_name}</p>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #6b7280;">${store.address}</p>
              ${distanceText ? `<p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">${distanceText}</p>` : ""}
            </div>
          `);

          markersRef.current.push(storeMarker);
        });

        // Create customer marker
        const customerMarker = L.marker(
          customerLocation
            ? [customerLocation.latitude, customerLocation.longitude]
            : [customerLat, customerLng],
          {
            icon: createCustomIcon("#DC2626", "🏠", "customer"),
          }
        ).addTo(map);

        const customerAddress = data.order.shipping_address_1;
        customerMarker.bindPopup(`
          <div style="min-width: 220px; padding: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <div style="width: 8px; height: 8px; background-color: #DC2626; border-radius: 50%;"></div>
              <strong style="color: #1f2937;">Delivery Location</strong>
            </div>
            <p style="margin: 0; font-size: 12px; color: #6b7280;">${customerAddress}</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #9ca3af;">${data.order.shipping_city}, ${data.order.shipping_state}</p>
          </div>
        `);

        markersRef.current.push(customerMarker);

        // Fit bounds to show all markers
        const bounds = L.latLngBounds(waypoints);
        map.fitBounds(bounds, { padding: [50, 50] });

        // Map is ready, hide loading
        setIsMapLoading(false);
      } catch (error) {
        console.error("Error initializing map:", error);
        setIsMapLoading(false);
      }
    };

    initializeMap();

    // Cleanup function
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      polylinesRef.current.forEach((polyline) => polyline.remove());
    };
  }, [data, useTransportLayer]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className="w-full h-full rounded-lg z-0"
        style={{ minHeight: "500px" }}
      />

      {/* Map initialization loading */}
      {isMapLoading && (
        <div className="absolute inset-0 bg-white dark:bg-gray-900 flex items-center justify-center rounded-lg z-20">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-blue-500 rounded-full animate-pulse"></div>
              </div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Loading Map
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Calculating route and markers...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location update loading (shows over map) */}
      {isLoading && !isMapLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg z-10">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Updating location...
            </span>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
};

export default OpenStreetMapTracking;
