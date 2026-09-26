"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { SidebarShell } from "../../../components/SidebarShell";
import { 
  BarChart4, Activity, ShieldCheck, Download, AlertTriangle, 
  Lightbulb, TrendingUp, TrendingDown, EyeOff, Settings, 
  ChevronDown, Layers, MapPin, Database, Share2, RefreshCw, Loader2
} from "lucide-react";
import { LockedFeatureGate } from "../../../components/LockedFeatureGate";

export default function IndustryBenchmarksPage() {
  const [view, setView] = useState<"dashboard" | "privacy">("dashboard");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [benchmarkData, setBenchmarkData] = useState<any>(null);
  const [consent, setConsent] = useState<any>(null);

  // Cohort Filters
  const [industry, setIndustry] = useState("Retail");
  const [revenueBand, setRevenueBand] = useState("₹10M–₹20M");

  // Geolocation & Nearby Location State
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied" | "unsupported">("idle");
  const [detectedLocationName, setDetectedLocationName] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Keep ref to avoid stale closures in geolocation callback
  const filtersRef = useRef({ industry, revenueBand, detectedLocationName, coords });
  useEffect(() => {
    filtersRef.current = { industry, revenueBand, detectedLocationName, coords };
  }, [industry, revenueBand, detectedLocationName, coords]);

  const fetchConsent = async () => {
    try {
      const res = await fetch(`/api/v1/benchmarks/consent`);
      if (res.ok) {
        const json = await res.json();
        setConsent(json.consent);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBenchmark = useCallback(async (customParams?: {
    industry?: string;
    revenueBand?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
    isNearby?: boolean;
  }) => {
    const current = filtersRef.current;
    const activeIndustry = customParams?.industry ?? current.industry;
    const activeRevenue = customParams?.revenueBand ?? current.revenueBand;
    const activeRegion = customParams?.region ?? (current.detectedLocationName || "Nearby Location");
    const activeLat = customParams?.latitude ?? current.coords?.latitude;
    const activeLng = customParams?.longitude ?? current.coords?.longitude;

    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/v1/benchmarks/data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry: activeIndustry,
          revenueBand: activeRevenue,
          region: activeRegion,
          latitude: activeLat,
          longitude: activeLng,
          isNearby: true,
        }),
      });
      
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.message || "Failed to load benchmarks.");
      } else {
        setBenchmarkData(json.data);
      }
    } catch (err) {
      setErrorMsg("Network error loading benchmarks.");
    } finally {
      setLoading(false);
    }
  }, []);

  const requestNearbyLocation = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationStatus("unsupported");
      setLocationError("Geolocation is not supported by your browser.");
      fetchBenchmark();
      return;
    }

    setLocationStatus("requesting");
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ latitude: lat, longitude: lng });
        setLocationStatus("granted");
        setLocationError(null);

        let nearbyLabel = "Nearby Location";
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "User-Agent": "Vertofi-Platform/1.0" } }
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            const place =
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.suburb ||
              geoData.address?.county ||
              geoData.address?.state_district ||
              geoData.address?.state;
            if (place) {
              nearbyLabel = `Nearby (${place})`;
            } else {
              nearbyLabel = `Nearby (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
            }
          } else {
            nearbyLabel = `Nearby (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
          }
        } catch {
          nearbyLabel = `Nearby (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
        }

        setDetectedLocationName(nearbyLabel);
        fetchBenchmark({
          region: nearbyLabel,
          latitude: lat,
          longitude: lng,
          isNearby: true,
        });
      },
      (err) => {
        setLocationStatus("denied");
        if (err.code === err.PERMISSION_DENIED) {
          setLocationError("Location access is required to find nearby benchmarks.");
        } else if (err.code === err.TIMEOUT) {
          setLocationError("Location request timed out. Please retry.");
        } else {
          setLocationError("Location access is required to find nearby benchmarks.");
        }
        fetchBenchmark({ region: "Nearby Location", isNearby: true });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchBenchmark]);

  // Initial mount: run once
  useEffect(() => {
    fetchConsent();
    requestNearbyLocation();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFilterChange = (key: string, value: string) => {
    if (key === "industry") {
      setIndustry(value);
      fetchBenchmark({ industry: value });
    }
    if (key === "revenue") {
      setRevenueBand(value);
      fetchBenchmark({ revenueBand: value });
    }
  };

  const handleConsentToggle = async (action: "opt_in" | "opt_out" | "delete") => {
    try {
      const res = await fetch(`/api/v1/benchmarks/consent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchConsent();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getPercentilePosition = (metric: any) => {
    const val = metric.yourBusiness;
    if (val >= metric.p90) return { label: "Above 90th Pct", color: "text-rose-500", bg: "bg-rose-100" };
    if (val >= metric.p75) return { label: "Above 75th Pct", color: "text-amber-500", bg: "bg-amber-100" };
    if (val <= metric.p25) return { label: "Below 25th Pct", color: "text-emerald-500", bg: "bg-emerald-100" };
    return { label: "Near Median", color: "text-blue-500", bg: "bg-blue-100" };
  };

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in max-w-7xl mx-auto">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <BarChart4 className="h-8 w-8 text-indigo-600" /> Industry Benchmarks
          </h1>
          <p className="text-slate-500 mt-1">See how your business really performs — not just intuition.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 border border-slate-200 transition-colors">
            <Share2 className="h-4 w-4" /> Share Snapshot
          </button>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow flex items-center gap-2 transition-colors">
            <Download className="h-4 w-4" /> Deep Dive PDF
          </button>
        </div>
      </div>

      {/* Cohort Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2">Cohort Selector</p>
        
        {/* 1. Industry Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Layers className="h-4 w-4 text-slate-400" />
          <select 
            value={industry} 
            onChange={(e) => handleFilterChange("industry", e.target.value)} 
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="Retail">Retail</option>
            <option value="Retail → Apparel">Retail → Apparel</option>
            <option value="Technology">Technology</option>
            <option value="Manufacturing">Manufacturing</option>
          </select>
        </div>
        
        {/* 2. Revenue Range Selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Activity className="h-4 w-4 text-slate-400" />
          <select 
            value={revenueBand} 
            onChange={(e) => handleFilterChange("revenue", e.target.value)} 
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="Micro">Micro (&lt;₹10M)</option>
            <option value="₹10M–₹20M">₹10M–₹20M</option>
            <option value="₹20M–₹50M">₹20M–₹50M</option>
            <option value="Growth">Growth (&gt;₹50M)</option>
          </select>
        </div>

        {/* 3. Location Selector — Exclusively "Nearby Location" with native Geolocation */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          {locationStatus === "requesting" ? (
            <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
          ) : (
            <MapPin className={`h-4 w-4 ${locationStatus === "granted" ? "text-indigo-600" : "text-slate-400"}`} />
          )}
          <select 
            value="nearby" 
            onChange={(e) => {
              if (e.target.value === "nearby") {
                requestNearbyLocation();
              }
            }}
            onClick={() => {
              if (locationStatus !== "granted" && locationStatus !== "requesting") {
                requestNearbyLocation();
              }
            }}
            className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="nearby">
              {locationStatus === "requesting" 
                ? "Detecting location..." 
                : locationStatus === "granted" && detectedLocationName 
                ? detectedLocationName 
                : "Nearby Location"}
            </option>
          </select>
        </div>
      </div>

      {/* Geolocation Notice / Permission Retry Bar */}
      {locationError && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="font-medium">{locationError}</span>
          </div>
          <button
            type="button"
            onClick={requestNearbyLocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition text-xs shrink-0 shadow-xs cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" /> Retry Location Access
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-6 rounded-xl flex items-start gap-4">
          <ShieldCheck className="h-6 w-6 text-rose-500 shrink-0" />
          <div>
            <h3 className="font-bold text-rose-800 text-lg">Benchmark privacy notice</h3>
            <p className="text-rose-600 mt-1">{errorMsg}</p>
          </div>
        </div>
      )}

      {loading && !errorMsg && (
        <div className="p-12 flex justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
        </div>
      )}

      {benchmarkData && !errorMsg && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Health Score Overview */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 flex flex-col items-center text-center">
                 <p className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-4">Business Health Score</p>
                 <div className="h-28 w-28 rounded-full border-8 border-indigo-500/50 flex items-center justify-center bg-indigo-700/50 backdrop-blur-sm mb-4">
                    <span className="text-5xl font-black">{benchmarkData.healthScore}</span>
                 </div>
                 <p className="text-indigo-100 text-sm">Compared against {benchmarkData.sampleSize} peers in your cohort.</p>
              </div>
              <div className="absolute -bottom-10 -right-10 h-40 w-40 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
            </div>

            {/* Recommendations Panel */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-amber-50 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <h3 className="font-bold text-amber-900">Top Benchmark Insights</h3>
              </div>
              <div className="p-4 space-y-4">
                {benchmarkData.recommendations.map((rec: any, i: number) => (
                  <div key={i} className="pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <h4 className="font-bold text-slate-800 text-sm mb-1">{rec.title}</h4>
                    <p className="text-xs text-slate-600 mb-2 leading-relaxed">{rec.description}</p>
                    <div className="bg-emerald-50 text-emerald-700 px-2 py-1.5 rounded text-xs font-bold flex justify-between items-center">
                      <span>Est. Difference:</span>
                      <span>{rec.estimatedImpact}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Peer Comparison Table */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg">Percentile Peer Comparison</h3>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                  n = {benchmarkData.sampleSize} businesses
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Metric</th>
                      <th className="p-4 text-right">Your Business</th>
                      <th className="p-4 text-right">Peer Median</th>
                      <th className="p-4 text-right text-slate-400">P25</th>
                      <th className="p-4 text-right text-slate-400">P75</th>
                      <th className="p-4">Your Position</th>
                      <th className="p-4">Action Focus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {benchmarkData.metrics.map((m: any, i: number) => {
                      const pos = getPercentilePosition(m);
                      return (
                        <tr key={i} className="hover:bg-slate-50 group">
                          <td className="p-4 font-bold text-slate-800">{m.name}</td>
                          <td className="p-4 text-right font-black text-indigo-600 text-base">{m.yourBusiness}{m.unit}</td>
                          <td className="p-4 text-right font-bold text-slate-700">{m.median}{m.unit}</td>
                          <td className="p-4 text-right text-slate-400 font-mono text-xs">{m.p25}{m.unit}</td>
                          <td className="p-4 text-right text-slate-400 font-mono text-xs">{m.p75}{m.unit}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${pos.bg} ${pos.color}`}>
                              {pos.label}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500 group-hover:text-slate-800 transition-colors">
                            {m.action}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Explorer Hook */}
            <div className="bg-slate-900 rounded-xl p-8 text-white shadow-lg flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-indigo-400" /> Expense Explorer
                </h3>
                <p className="text-slate-400 text-sm max-w-xl">
                  Drill down into individual expense lines (Rent, Payroll, Marketing) to view distributions and identify specific outliers.
                </p>
              </div>
              <button className="bg-indigo-600 hover:bg-indigo-500 px-6 py-2 rounded-lg font-bold transition-colors">
                Open Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPrivacy = () => {
    if (!consent) return (
      <div className="p-12 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );

    return (
      <div className="space-y-6 animate-in fade-in max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <EyeOff className="h-6 w-6 text-slate-500" /> Benchmark Privacy & Consent
        </h2>
        
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8 pb-8 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Data Contribution Status</h3>
              <p className="text-slate-500 text-sm mt-1">Manage whether your anonymized data contributes to the industry benchmarks.</p>
            </div>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider ${consent.optedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {consent.optedIn ? 'Opted In' : 'Opted Out'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Direct Identifiers Removed</h4>
                  <p className="text-xs text-slate-500 mt-1">Name, PAN, GSTIN, and exact addresses are stripped before aggregation.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">k-Anonymity Enforced</h4>
                  <p className="text-xs text-slate-500 mt-1">We never publish aggregates unless at least 5 businesses contribute to the cohort.</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Differential Privacy</h4>
                  <p className="text-xs text-slate-500 mt-1">Calibrated noise is added to sensitive slices when sample sizes are small to prevent reverse-engineering.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Database className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Audit Logged</h4>
                  <p className="text-xs text-slate-500 mt-1">All consent changes and data sharing operations are securely logged.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-4">Consent Actions</h4>
            <div className="flex flex-wrap gap-4">
              {consent.optedIn ? (
                <button onClick={() => handleConsentToggle("opt_out")} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md font-bold text-sm transition-colors shadow-sm">
                  Opt-Out of Benchmarking
                </button>
              ) : (
                <button onClick={() => handleConsentToggle("opt_in")} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-bold text-sm transition-colors shadow-sm">
                  Opt-In to Benchmarking
                </button>
              )}
              <button onClick={() => handleConsentToggle("delete")} className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 px-4 py-2 rounded-md font-bold text-sm transition-colors shadow-sm">
                Request Data Deletion
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-4 uppercase">Last updated: {new Date(consent.timestamp).toLocaleString()}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <SidebarShell>
      <main className="px-4 py-8 bg-slate-50 min-h-screen">
        <LockedFeatureGate feature="industry_benchmarks">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-8 w-fit mx-auto">
            <button onClick={() => setView("dashboard")} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors flex items-center gap-2 ${view === 'dashboard' ? 'bg-indigo-600 shadow-md text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}>
              <BarChart4 className="h-4 w-4" /> Benchmark Dashboard
            </button>
            <button onClick={() => setView("privacy")} className={`px-4 py-2 text-sm font-bold rounded-full transition-colors flex items-center gap-2 ${view === 'privacy' ? 'bg-indigo-600 shadow-md text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'}`}>
              <EyeOff className="h-4 w-4" /> Privacy & Consent
            </button>
          </div>

          {view === "dashboard" && renderDashboard()}
          {view === "privacy" && renderPrivacy()}
        </LockedFeatureGate>
      </main>
    </SidebarShell>
  );
}
