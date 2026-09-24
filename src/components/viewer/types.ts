export type Shape = "ARROW" | "ELLIPSE" | "RECT";

export type Annotation = {
  id?: string;
  shape: Shape;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  spoiler: boolean;
};

export type ViewerMedia = {
  id: string;
  kind: "IMAGE" | "WSI" | "VIDEO";
  stain: string;
  magnification: string;
  caption: string;
  width: number | null;
  height: number | null;
  dzi: string | null;
  thumb: string | null;
  video: string | null;
  annotations: Annotation[];
};
