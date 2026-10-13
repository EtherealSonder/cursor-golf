/** P1 geometry diagnostics. Disabled in normal gameplay; opt-in via ?geometryprofile=counters or =sampled. */
export type GeometryProfilingMode = "off" | "counters" | "sampled";
export class CourseGeometryAccelerationProfiler {
 private static mode: GeometryProfilingMode = "off";
 private static counters: Record<string, number> = Object.create(null) as Record<string, number>;
 private static pointSampleSequence = 0;
 private static readonly SAMPLE_INTERVAL = 256;
 public static configure(mode: GeometryProfilingMode): void { this.mode = mode; this.reset(); }
 public static getMode(): GeometryProfilingMode { return this.mode; }
 public static add(name: string, amount = 1): void {
  if (this.mode === "off") return;
  this.counters[name] = (this.counters[name] ?? 0) + amount;
 }
 /** Only a 1/256 sample uses a high-resolution timer, and only in explicit sampled mode. */
 public static shouldSamplePoint(): boolean {
  return this.mode === "sampled" && (++this.pointSampleSequence % this.SAMPLE_INTERVAL === 0);
 }
 public static recordPointSample(milliseconds: number): void {
  this.add("pointQuerySampleCount");
  this.add("pointQuerySampledCpuMs", milliseconds);
 }
 /** Non-hot diagnostic helper. No timer or callback invocation when sampling is disabled. */
 public static timed<T>(name: string, fn: () => T): T {
  if (this.mode !== "sampled") return fn();
  const start = performance.now();
  try { return fn(); } finally { this.add(`${name}CpuMs`, performance.now() - start); }
 }
 public static reset(): void {
  this.counters = Object.create(null) as Record<string, number>;
  this.pointSampleSequence = 0;
 }
 public static drain(): Record<string, number> {
  const result = { ...this.counters }; this.reset();
  const hits = result.cellCacheHits ?? 0, misses = result.cellCacheMisses ?? 0;
  result.cellCacheLookups = result.cellCacheLookups ?? (hits+misses);
  result.cellCacheHitRate = hits + misses ? hits / (hits + misses) : 0;
  result.cellCacheInstrumentationActive = this.mode === "off" ? 0 : 1;
  const queries = result.spatialIndexQueries ?? 0;
  result.spatialIndexCandidatesPerQuery = queries ? (result.spatialIndexCandidates ?? 0) / queries : 0;
  if ((result.pointQuerySampleCount ?? 0) > 0) {
   result.pointQuerySampleMeanMs = (result.pointQuerySampledCpuMs ?? 0) / result.pointQuerySampleCount;
  }
  return result;
 }
}
