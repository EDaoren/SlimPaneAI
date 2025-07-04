interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private isEnabled = false;

  constructor() {
    // 在开发环境中启用性能监控
    this.isEnabled = import.meta.env.DEV || localStorage.getItem('slimpane-debug') === 'true';
  }

  start(name: string) {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now()
    });
  }

  end(name: string) {
    if (!this.isEnabled) return;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // 记录性能数据
    if (duration > 16) { // 超过一帧的时间（16ms）
      console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`);
    } else {
      console.log(`⚡ ${name}: ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  measure<T>(name: string, fn: () => T): T;
  measure<T>(name: string, fn: () => Promise<T>): Promise<T>;
  measure<T>(name: string, fn: () => T | Promise<T>): T | Promise<T> {
    if (!this.isEnabled) {
      return fn();
    }

    this.start(name);
    
    try {
      const result = fn();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          this.end(name);
        });
      } else {
        this.end(name);
        return result;
      }
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  getMetrics() {
    return Array.from(this.metrics.values());
  }

  clearMetrics() {
    this.metrics.clear();
  }

  // 监控 DOM 操作性能
  observeDOM(element: Element, callback?: (entries: PerformanceObserverEntry[]) => void) {
    if (!this.isEnabled || !('PerformanceObserver' in window)) return;

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.duration > 16) {
            console.warn(`🐌 DOM operation: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
          }
        });
        
        if (callback) {
          callback(entries);
        }
      });

      observer.observe({ entryTypes: ['measure', 'navigation', 'paint'] });
      
      return observer;
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }

  // 监控内存使用
  logMemoryUsage(label?: string) {
    if (!this.isEnabled || !('memory' in performance)) return;

    const memory = (performance as any).memory;
    const used = Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100;
    const total = Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100;
    const limit = Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100;

    console.log(`🧠 Memory ${label || ''}: ${used}MB / ${total}MB (limit: ${limit}MB)`);
    
    return { used, total, limit };
  }

  // 监控渲染性能
  measureRender(componentName: string, renderFn: () => void) {
    if (!this.isEnabled) {
      renderFn();
      return;
    }

    return this.measure(`render-${componentName}`, () => {
      const startTime = performance.now();
      
      renderFn();
      
      // 等待下一帧来测量实际渲染时间
      requestAnimationFrame(() => {
        const renderTime = performance.now() - startTime;
        if (renderTime > 16) {
          console.warn(`🎨 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
        }
      });
    });
  }

  // 启用/禁用监控
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (enabled) {
      localStorage.setItem('slimpane-debug', 'true');
    } else {
      localStorage.removeItem('slimpane-debug');
    }
  }

  isMonitoringEnabled() {
    return this.isEnabled;
  }
}

// 单例实例
export const perfMonitor = new PerformanceMonitor();

// 便捷的装饰器函数
export function measurePerformance(name: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function(...args: any[]) {
      return perfMonitor.measure(`${target.constructor.name}.${propertyKey}`, () => {
        return originalMethod.apply(this, args);
      });
    };
    
    return descriptor;
  };
}
