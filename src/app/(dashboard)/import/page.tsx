"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";

interface ParseResult {
  addressRaw: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  priority?: string;
  propertyType?: string;
  beds?: number;
  baths?: number;
  squareFeet?: number;
  lotSize?: number;
  yearBuilt?: number;
  mlsNumber?: string;
  source?: string;
  price?: number;
  latitude?: number;
  longitude?: number;
  redfinUrl?: string;
}

function parseNumber(value: string): number | undefined {
  const cleaned = value.replace(/[,$\s]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? undefined : num;
}

function parseFloatNumber(value: string): number | undefined {
  const cleaned = value.replace(/[,$\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

function parseCSV(text: string): ParseResult[] {
  const lines = text.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  // Find column indices
  const findIdx = (patterns: string[]) => headers.findIndex((h) => patterns.some((p) => h.includes(p)));

  const addressIdx = findIdx(["address", "street"]);
  const cityIdx = findIdx(["city"]);
  const stateIdx = findIdx(["state", "province"]);
  const zipIdx = findIdx(["zip", "postal"]);
  const statusIdx = findIdx(["status"]);
  const priorityIdx = findIdx(["priority"]);
  const propertyTypeIdx = findIdx(["property type"]);
  const bedsIdx = findIdx(["beds"]);
  const bathsIdx = findIdx(["baths"]);
  const squareFeetIdx = findIdx(["square feet"]);
  const lotSizeIdx = findIdx(["lot size"]);
  const yearBuiltIdx = findIdx(["year built"]);
  const mlsNumberIdx = findIdx(["mls"]);
  const sourceIdx = findIdx(["source"]);
  const priceIdx = findIdx(["price"]);
  const latitudeIdx = findIdx(["latitude"]);
  const longitudeIdx = findIdx(["longitude"]);
  const urlIdx = findIdx(["url", "redfin.com"]);

  if (addressIdx < 0) {
    console.error("No address column found. Headers:", headers);
    return [];
  }

  const results: ParseResult[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

    const addressRaw = values[addressIdx] || "";
    if (!addressRaw || addressRaw.length < 3) continue;

    const result: ParseResult = {
      addressRaw,
      city: cityIdx >= 0 ? values[cityIdx] : undefined,
      state: stateIdx >= 0 ? values[stateIdx] : undefined,
      zip: zipIdx >= 0 ? values[zipIdx] : undefined,
      status: statusIdx >= 0 ? values[statusIdx]?.toUpperCase() : undefined,
      priority: priorityIdx >= 0 ? values[priorityIdx]?.toUpperCase() : undefined,
      propertyType: propertyTypeIdx >= 0 ? values[propertyTypeIdx] : undefined,
      beds: bedsIdx >= 0 ? parseNumber(values[bedsIdx]) : undefined,
      baths: bathsIdx >= 0 ? parseFloatNumber(values[bathsIdx]) : undefined,
      squareFeet: squareFeetIdx >= 0 ? parseNumber(values[squareFeetIdx]) : undefined,
      lotSize: lotSizeIdx >= 0 ? parseNumber(values[lotSizeIdx]) : undefined,
      yearBuilt: yearBuiltIdx >= 0 ? parseNumber(values[yearBuiltIdx]) : undefined,
      mlsNumber: mlsNumberIdx >= 0 ? values[mlsNumberIdx] : undefined,
      source: sourceIdx >= 0 ? values[sourceIdx] : undefined,
      price: priceIdx >= 0 ? parseNumber(values[priceIdx]) : undefined,
      latitude: latitudeIdx >= 0 ? parseFloatNumber(values[latitudeIdx]) : undefined,
      longitude: longitudeIdx >= 0 ? parseFloatNumber(values[longitudeIdx]) : undefined,
      redfinUrl: urlIdx >= 0 ? values[urlIdx] : undefined,
    };

    results.push(result);
  }

  return results;
}

export default function ImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParseResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<{
    imported: number;
    duplicates: number;
    errors: string[];
  } | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setError("");
    setResults(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const data = parseCSV(text);
      setLoading(false);
      if (data.length === 0) {
        setError(
          "No valid data found. Make sure the CSV has an ADDRESS column."
        );
      } else {
        setParsedData(data);
      }
    };
    reader.onerror = () => {
      setLoading(false);
      setError("Failed to read file");
    };
    reader.readAsText(selectedFile);
  }

  async function handleImport() {
    setImporting(true);
    setError("");

    try {
      const res = await fetch("/api/upload/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: parsedData }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
      } else {
        setResults(data);
        setParsedData([]);
        setFile(null);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-[#94a3b8] hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="glass-card p-6">
        <h1 className="text-xl font-semibold mb-6">CSV Import</h1>

        {!parsedData.length && !results && (
          <div className="space-y-6">
            <div className="border-2 border-dashed border-[#1e2738] rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-[#94a3b8] mx-auto mb-4" />
              <p className="text-[#94a3b8] mb-4">
                Upload a CSV file with your property data
              </p>
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg cursor-pointer">
                  <FileText className="w-4 h-4" />
                  Select CSV File
                </span>
              </label>
            </div>

            <div className="text-sm text-[#94a3b8]">
              <p className="font-medium mb-2">Supported formats:</p>
              <div className="bg-[#161d2e] p-3 rounded-lg text-xs space-y-1">
                <p className="text-white">Redfin export with columns:</p>
                <p>ADDRESS, CITY, STATE OR PROVINCE, ZIP OR POSTAL CODE</p>
                <p>PROPERTY TYPE, BEDS, BATHS, SQUARE FEET, LOT SIZE, YEAR BUILT</p>
                <p>MLS#, SOURCE, PRICE, URL, LATITUDE, LONGITUDE</p>
                <p className="text-white mt-2">Generic CSV:</p>
                <p>address, city, state, zip</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-8 text-[#94a3b8]">Parsing CSV...</div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-lg text-[#ef4444]">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {parsedData.length > 0 && !results && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#94a3b8]">
                Found {parsedData.length} records in {file?.name}
              </p>
              <button
                onClick={() => {
                  setParsedData([]);
                  setFile(null);
                }}
                className="text-sm text-[#94a3b8] hover:text-white"
              >
                Clear
              </button>
            </div>

            <div className="max-h-64 overflow-auto border border-[#1e2738] rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-[#161d2e] sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Address</th>
                    <th className="text-left p-2 font-medium">City</th>
                    <th className="text-left p-2 font-medium">State</th>
                    <th className="text-left p-2 font-medium">ZIP</th>
                    <th className="text-left p-2 font-medium">Beds</th>
                    <th className="text-left p-2 font-medium">Baths</th>
                    <th className="text-left p-2 font-medium">Sq Ft</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2738]">
                  {parsedData.map((row, i) => (
                    <tr key={i} className="hover:bg-[#161d2e]">
                      <td className="p-2">{row.addressRaw}</td>
                      <td className="p-2 text-[#94a3b8]">{row.city}</td>
                      <td className="p-2 text-[#94a3b8]">{row.state}</td>
                      <td className="p-2 text-[#94a3b8]">{row.zip}</td>
                      <td className="p-2 text-[#94a3b8]">{row.beds}</td>
                      <td className="p-2 text-[#94a3b8]">{row.baths}</td>
                      <td className="p-2 text-[#94a3b8]">{row.squareFeet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setParsedData([]);
                  setFile(null);
                }}
                className="px-4 py-2 border border-[#1e2738] text-[#94a3b8] hover:text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg disabled:opacity-50"
              >
                {importing ? "Importing..." : "Import All"}
              </button>
            </div>
          </div>
        )}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg text-[#22c55e]">
              <CheckCircle className="w-4 h-4" />
              Import completed!
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-[#161d2e] rounded-lg text-center">
                <p className="text-2xl font-semibold text-[#22c55e]">
                  {results.imported}
                </p>
                <p className="text-sm text-[#94a3b8]">Imported</p>
              </div>
              <div className="p-4 bg-[#161d2e] rounded-lg text-center">
                <p className="text-2xl font-semibold text-[#f59e0b]">
                  {results.duplicates}
                </p>
                <p className="text-sm text-[#94a3b8]">Duplicates Skipped</p>
              </div>
              <div className="p-4 bg-[#161d2e] rounded-lg text-center">
                <p className="text-2xl font-semibold text-[#ef4444]">
                  {results.errors.length}
                </p>
                <p className="text-sm text-[#94a3b8]">Errors</p>
              </div>
            </div>

            {results.errors.length > 0 && (
              <div className="text-xs text-[#94a3b8] max-h-32 overflow-auto">
                {results.errors.slice(0, 5).map((err, i) => (
                  <p key={i} className="text-[#ef4444]">
                    {err}
                  </p>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => router.push("/properties")}
                className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium rounded-lg"
              >
                View Properties
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
