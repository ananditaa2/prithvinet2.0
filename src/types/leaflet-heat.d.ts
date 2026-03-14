// Type declarations for leaflet.heat
import * as L from 'leaflet';

declare module 'leaflet' {
  interface LeafletHeatLayer extends L.Layer {
    setLatLngs(latlngs: Array<[number, number, number]>): LeafletHeatLayer;
    addLatLng(latlng: [number, number, number]): LeafletHeatLayer;
    setOptions(options: HeatLayerOptions): LeafletHeatLayer;
    redraw(): void;
  }

  interface HeatLayerOptions {
    radius?: number;
    blur?: number;
    maxZoom?: number;
    minOpacity?: number;
    maxOpacity?: number;
    max?: number;
    gradient?: Record<number, string>;
  }

  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: HeatLayerOptions
  ): LeafletHeatLayer;
}

export {};
