let registered = false;
let registrationPromise: Promise<void> | null = null;

export function registerECharts(): Promise<void> {
  if (registered) {
    return Promise.resolve();
  }
  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    try {
      const { use } = await import('echarts/core');
      const { CanvasRenderer } = await import('echarts/renderers');
      const [
        { LineChart, BarChart, PieChart, GaugeChart, HeatmapChart },
        { TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent, DatasetComponent },
      ] = await Promise.all([
        import('echarts/charts'),
        import('echarts/components'),
      ]);

      use([
        CanvasRenderer,
        LineChart, BarChart, PieChart, GaugeChart, HeatmapChart,
        TooltipComponent, LegendComponent, GridComponent, TitleComponent, DataZoomComponent, DatasetComponent,
      ]);
      registered = true;
    } catch (error) {
      registered = false; // Reset on failure so retry can work
      registrationPromise = null;
      console.error('[registerECharts] FAILED:', error);
      throw error;
    }
  })();

  return registrationPromise;
}

export function isEChartsRegistered(): boolean {
  return registered;
}
