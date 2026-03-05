import { FC, useEffect, useRef } from "react";
import type { GoogleMapProps } from "./types/GoogleMap.types";
import { useTheme } from "next-themes";

const GoogleMap: FC<GoogleMapProps> = ({
  latLng,
  onLocationUpdate,
  height = 400,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const isDragging = useRef<boolean>(false);

  const theme = useTheme();

  useEffect(() => {
    if (!mapRef.current) return;

    async function initMap() {
      try {
        // Load Maps and Marker libraries
        if (!window.google?.maps) return;

        const { Map } = (await google.maps.importLibrary(
          "maps",
        )) as google.maps.MapsLibrary;

        const { AdvancedMarkerElement } = (await google.maps.importLibrary(
          "marker",
        )) as google.maps.MarkerLibrary;

        const { ColorScheme } = (await google.maps.importLibrary(
          "core",
        )) as google.maps.CoreLibrary;

        // Initialize the map
        if (!mapInstance.current) {
          mapInstance.current = new Map(mapRef.current!, {
            center: latLng || { lat: 0, lng: 0 },
            zoom: 16,
            mapId: "123456",
            streetViewControl: false,
            colorScheme:
              theme.theme == "light" ? ColorScheme.LIGHT : ColorScheme.DARK,
          });

          // Add click listener to the map
          mapInstance.current.addListener(
            "click",
            (e: google.maps.MapMouseEvent) => {
              if (e.latLng && !isDragging.current) {
                const newPosition = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                };

                // Update marker position
                if (markerInstance.current) {
                  markerInstance.current.position = newPosition;
                } else {
                  // Create marker if it doesn't exist
                  markerInstance.current = new AdvancedMarkerElement({
                    map: mapInstance.current,
                    position: newPosition,
                    gmpDraggable: true,
                    title: "Selected Location",
                  });

                  // Add drag listeners to the marker
                  setupMarkerDragListeners(markerInstance.current);
                }

                // Notify parent component about the location change
                if (onLocationUpdate) {
                  onLocationUpdate(newPosition);
                }
              }
            },
          );
        }

        // Add or update the marker
        if (latLng) {
          if (!markerInstance.current) {
            markerInstance.current = new AdvancedMarkerElement({
              map: mapInstance.current,
              position: latLng,
              gmpDraggable: true,
              title: "Selected Location",
            });

            // Add drag listeners to the marker
            setupMarkerDragListeners(markerInstance.current);
          } else {
            // Only update marker position if not currently dragging
            if (!isDragging.current) {
              markerInstance.current.position = latLng;
            }
          }

          // Animate the map center to the new latLng (only if not dragging)
          if (mapInstance.current && !isDragging.current) {
            mapInstance.current.panTo(latLng);
          }
        }
      } catch (error) {
        console.error("Error initializing Google Maps:", error);
      }
    }

    // Helper function to setup drag listeners on marker
    function setupMarkerDragListeners(
      marker: google.maps.marker.AdvancedMarkerElement,
    ) {
      // Wait for marker to be fully initialized
      setTimeout(() => {
        if (marker.element) {
          // Drag start listener
          marker.addListener("dragstart", () => {
            isDragging.current = true;
          });

          // Drag end listener
          marker.addListener(
            "dragend",
            (e: { latLng: { lat: () => number; lng: () => number } }) => {
              if (e.latLng) {
                const newPosition = {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                };

                // Set dragging to false after a small delay to prevent
                // immediate position updates from parent
                setTimeout(() => {
                  isDragging.current = false;
                }, 100);

                // Notify parent component about the location change
                if (onLocationUpdate) {
                  onLocationUpdate(newPosition);
                }
              }
            },
          );
        }
      }, 100);
    }

    initMap();
  }, [latLng, onLocationUpdate, theme]);

  return (
    <div
      ref={mapRef}
      className={`bg-gray-100 rounded-lg w-full h-[${height}px]`}
    />
  );
};

export default GoogleMap;
