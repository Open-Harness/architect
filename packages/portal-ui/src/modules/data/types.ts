// The data module: the names it exports (F7 decision 2). `Chart` is a namespace of `chartParts`; the rest are components.
export const dataNames = ["Board", "Chart", "Grid", "Stat", "StatGroup", "StatTrend", "StatValue", "Timeline", "Widget"] as const;
export type DataName = (typeof dataNames)[number];
export const chartParts = ["Area", "Bar", "Line"] as const;
export type ChartPart = (typeof chartParts)[number];
