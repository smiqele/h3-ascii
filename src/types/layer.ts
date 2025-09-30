export type Layer = {
  id: number;
  symbol: string;
  fg: string;
  bg: string;
  target: string;
  spread: number;
  visible: boolean;
  bgEnabled?: boolean;
};