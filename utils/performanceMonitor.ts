/**
 * Performance monitoring utility for tracking login performance
 */

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private loginStartTime: number = 0;

  startLoginFlow() {
    this.loginStartTime = performance.now();
    this.metrics.clear();
    console.log('🚀 Login performance monitoring started');
  }

  startMetric(name: string) {
    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  endMetric(name: string) {
    const metric = this.metrics.get(name);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      console.log(`⏱️ ${name}: ${metric.duration.toFixed(2)}ms`);
    }
  }

  endLoginFlow() {
    const totalTime = performance.now() - this.loginStartTime;
    console.log(`🏁 Total login time: ${totalTime.toFixed(2)}ms`);
    
    // Log breakdown
    const breakdown: string[] = [];
    this.metrics.forEach(metric => {
      if (metric.duration) {
        breakdown.push(`${metric.name}: ${metric.duration.toFixed(2)}ms`);
      }
    });
    
    if (breakdown.length > 0) {
      console.log('📊 Login breakdown:', breakdown.join(', '));
    }

    // Warn if login is slow
    if (totalTime > 3000) {
      console.warn(`⚠️ Slow login detected: ${totalTime.toFixed(2)}ms (target: <2000ms)`);
    }
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }
}

export const performanceMonitor = new PerformanceMonitor();