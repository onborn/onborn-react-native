export type UiIrChartPoint = { label?: string; value: number };

export type UiIrChartBar = {
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Where each bar sits, given the box the chart was handed.
 *
 * Kept out of the component so the arithmetic is testable without rendering:
 * a bar chart is mostly one scale decision, and getting it wrong shows up as a
 * flat row of nothing or bars past the top edge.
 *
 * The scale runs from zero rather than from the smallest value. A chart that
 * starts at the minimum exaggerates the difference between two columns, which
 * on an onboarding screen comparing "with" and "without" is the difference
 * between a claim and a misleading one.
 */
export function layoutUiIrChartBars(input: {
  series: readonly UiIrChartPoint[];
  width: number;
  height: number;
  gap?: number;
}): UiIrChartBar[] {
  const gap = input.gap ?? 8;
  const count = input.series.length;
  if (count === 0 || input.width <= 0 || input.height <= 0) return [];
  const barWidth = Math.max(
    1,
    (input.width - gap * (count - 1)) / Math.max(1, count),
  );
  const peak = Math.max(...input.series.map((point) => point.value), 0);
  return input.series.map((point, index) => {
    // A zero peak would divide by nothing; every bar is then flat, which is
    // the honest picture of a series that is all zeroes.
    const ratio = peak > 0 ? Math.max(0, point.value) / peak : 0;
    const barHeight = ratio * input.height;
    return {
      ...(point.label === undefined ? {} : { label: point.label }),
      x: index * (barWidth + gap),
      y: input.height - barHeight,
      width: barWidth,
      height: barHeight,
    };
  });
}

/** The polyline a line chart draws, in the same box. */
export function layoutUiIrChartLine(input: {
  series: readonly UiIrChartPoint[];
  width: number;
  height: number;
}): string {
  const count = input.series.length;
  if (count === 0 || input.width <= 0 || input.height <= 0) return "";
  const peak = Math.max(...input.series.map((point) => point.value), 0);
  const step = count > 1 ? input.width / (count - 1) : 0;
  return input.series
    .map((point, index) => {
      const ratio = peak > 0 ? Math.max(0, point.value) / peak : 0;
      const x = count > 1 ? index * step : input.width / 2;
      return `${x.toFixed(2)},${(input.height - ratio * input.height).toFixed(2)}`;
    })
    .join(" ");
}
