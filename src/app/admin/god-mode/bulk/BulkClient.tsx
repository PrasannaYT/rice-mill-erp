'use client'

import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, AlertCircle, Database } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';

const MODELS = [
  'User', 'Supplier', 'Farmer', 'Customer', 'Product', 'Godown',
  'PackingItem', 'Vehicle', 'Laborer', 'Bank', 'ExpenseCategory',
  'SparePart'
]; // Limited to master data for bulk imports safety

export function BulkClient() {
  const [selectedTable, setSelectedTable] = useState(MODELS[0]);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setPreviewData(results.data.slice(0, 5)); // Preview first 5 rows
        if (results.meta.fields) {
          setColumns(results.meta.fields);
        }
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a CSV file first.');
      return;
    }
    if (!password) {
      toast.error('Super Admin password required.');
      return;
    }

    setIsProcessing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await fetch(`/api/admin/god-mode/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              table: selectedTable,
              data: results.data,
              _password: password
            })
          });

          const json = await res.json();
          if (!res.ok) throw new Error(json.error || 'Bulk import failed');

          toast.success(`Successfully imported ${json.count} records!`);
          setFile(null);
          setPreviewData([]);
          setColumns([]);
          setPassword('');
          // Clear file input
          const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
        } catch (error: any) {
          toast.error(error.message);
        } finally {
          setIsProcessing(false);
        }
      }
    });
  };

  const handleExport = () => {
    toast.info(`Exporting ${selectedTable} data...`);
    window.location.href = `/api/admin/god-mode/bulk?table=${selectedTable}`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Import Section */}
      <div className="bg-[#1a1315] border border-red-900/40 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><Upload className="text-red-500" /> Bulk Import (CSV)</h3>
        <p className="text-sm text-red-300/70 mb-6">Upload a CSV file to mass insert records. Headers must match database column names exactly.</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-red-300 mb-1">Target Table</label>
            <select 
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setFile(null);
                setPreviewData([]);
              }}
              className="w-full bg-[#121212] border border-red-900/50 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="border-2 border-dashed border-red-900/40 rounded-lg p-6 text-center hover:bg-red-950/10 transition-colors">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              className="hidden" 
              id="csv-upload" 
            />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
              <FileSpreadsheet className="text-red-500 h-10 w-10 mb-2" />
              <span className="text-white font-medium">Click to select CSV</span>
              <span className="text-xs text-red-300/50 mt-1">{file ? file.name : 'Max 5MB'}</span>
            </label>
          </div>

          {previewData.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-300 mb-2 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /> Preview (First 5 Rows)</h4>
              <div className="overflow-x-auto border border-red-900/30 rounded-md bg-black/30">
                <table className="min-w-full text-xs">
                  <thead className="bg-red-950/30 border-b border-red-900/30">
                    <tr>
                      {columns.map(col => <th key={col} className="px-2 py-1 text-left text-red-300 font-medium whitespace-nowrap">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-900/20">
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        {columns.map(col => <td key={col} className="px-2 py-1 text-red-100/70 truncate max-w-[150px]">{row[col]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-yellow-950/30 border border-yellow-900/50 p-3 mt-4 rounded-md flex items-start gap-2">
                <AlertCircle className="text-yellow-500 shrink-0 h-4 w-4 mt-0.5" />
                <p className="text-xs text-yellow-200/80">Relationships (like foreign keys) must use the exact ID string. Dates must be ISO-8601 strings. Bypasses standard business logic validations.</p>
              </div>

              <div className="mt-4 space-y-3">
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Super Admin Password"
                  className="w-full bg-[#121212] border border-red-900/50 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button 
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Execute Bulk Import'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Export Section */}
      <div className="bg-[#1a1315] border border-red-900/40 p-6 rounded-lg flex flex-col">
        <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2"><Download className="text-red-500" /> Export Data</h3>
        <p className="text-sm text-red-300/70 mb-6">Download a complete CSV dump of any table in the system.</p>
        
        <div className="flex-1 flex flex-col justify-center items-center p-8 border border-red-900/20 bg-black/20 rounded-lg">
          <Database className="h-16 w-16 text-red-900/50 mb-4" />
          <p className="text-center text-red-200/60 mb-6 max-w-sm">
            Select a table on the left to configure the export target, then click below to generate the CSV.
          </p>
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-3 bg-red-950 text-red-400 hover:bg-red-900 hover:text-white border border-red-900 rounded-md transition-colors"
          >
            <Download size={18} /> Export {selectedTable} to CSV
          </button>
        </div>
      </div>
    </div>
  );
}
