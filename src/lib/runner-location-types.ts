import type { LatLng } from "./types";

export type RunnerLiveLocation = {
  runnerId: string;
  coord: LatLng;
  heading?: number;
  updatedAt: number;
};
