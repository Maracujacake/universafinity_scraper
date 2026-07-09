const BENCHMARK_KEY = 'universafinityGraphBenchmarks';

export function createGraphBenchmark(name, metadata = {}) {
  const startedAt = performance.now();
  const marks = [];

  return {
    mark(label, extra = {}) {
      marks.push({
        label,
        atMs: performance.now() - startedAt,
        ...extra,
      });
    },
    finish(extra = {}) {
      const totalMs = performance.now() - startedAt;
      const rows = marks.map((mark, index) => {
        const previous = index === 0 ? 0 : marks[index - 1].atMs;

        return {
          graph: name,
          step: mark.label,
          stepMs: Math.round((mark.atMs - previous) * 100) / 100,
          elapsedMs: Math.round(mark.atMs * 100) / 100,
          ...metadata,
          ...extra,
        };
      });

      const summary = {
        graph: name,
        totalMs: Math.round(totalMs * 100) / 100,
        timestamp: new Date().toISOString(),
        ...metadata,
        ...extra,
      };

      const entry = { summary, rows };
      const previousEntries = window.__UNIVERSAFINITY_BENCHMARKS__ || [];
      window.__UNIVERSAFINITY_BENCHMARKS__ = [...previousEntries, entry];

      try {
        localStorage.setItem(
          BENCHMARK_KEY,
          JSON.stringify(window.__UNIVERSAFINITY_BENCHMARKS__)
        );
      } catch (error) {
        console.warn('[GraphBenchmark] Could not persist benchmark data', error);
      }

      console.groupCollapsed(
        `[GraphBenchmark] ${name} - ${summary.totalMs}ms`
      );
      console.table(rows);
      console.table([summary]);
      console.info(
        `[GraphBenchmark] Stored in window.__UNIVERSAFINITY_BENCHMARKS__ and localStorage.${BENCHMARK_KEY}`
      );
      console.groupEnd();

      return entry;
    },
  };
}
