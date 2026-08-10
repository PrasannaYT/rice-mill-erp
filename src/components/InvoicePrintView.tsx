'use client';

import { useState } from 'react';
import { updateInvoiceDetailsAction } from '@/app/actions/sales';
import { toast } from 'sonner';
import { Printer, Save, ArrowLeft, Share2, Download, Edit3, X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

type InvoicePrintProps = {
  invoice: {
    id: string;
    createdAt: Date | string;
    invoiceNumber: string;
    deliveryNote?: string | null;
    modeOfPayment?: string | null;
    buyersOrderNo?: string | null;
    dispatchDocNo?: string | null;
    destination?: string | null;
    vehicleNo?: string | null;
    termsOfDelivery?: string | null;
    otherReferences?: string | null;
    customer: {
      name: string;
      address?: string | null;
      gstin?: string | null;
    };
    vehicle?: {
      licensePlate: string;
    } | null;
    items: Array<{
      id: string;
      product: { name: string };
      packingItemName?: string | null;
      quantity: number | string; // keeping string as we cast it to string in state
      rate: number | string;
      lineTotal: number | string;
    }>;
    subtotal?: number | string | null;
    totalAmount: number | string;
    transportFreightAmount?: number | string | null;
    cgstAmount?: number | string | null;
    sgstAmount?: number | string | null;
    igstAmount?: number | string | null;
    isModified?: boolean;
  }; 
};

function numberToWords(num: number): string {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  const numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  const n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim() + ' Only';
}

// Helper for inputs to keep A4 clean
const A4Input = ({ name, value, onChange, className = '' }: { 
  name?: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  className?: string;
}) => (
  <input 
    name={name} 
    value={value} 
    onChange={onChange} 
    className={`w-full bg-transparent outline-none border-b border-dashed border-gray-300 print:border-none focus:border-blue-400 focus:bg-blue-50 print:focus:bg-transparent ${className}`} 
  />
);

const MobileInput = ({ label, name, value, onChange, placeholder = "" }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string }) => (
  <div className="mb-1">
    <label className="block text-xs font-black text-gray-500 mb-1 uppercase tracking-wide">{label}</label>
    <input 
      name={name} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      className="input-brutal" 
    />
  </div>
);

export default function InvoicePrintView({ invoice }: InvoicePrintProps) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileWizardOpen, setIsMobileWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  
  const calculateBags = (item: { rate: number | string; lineTotal: number | string }) => {
    if (item.rate && item.lineTotal) {
      return Number(item.lineTotal) / Number(item.rate);
    }
    return 0;
  };

  const initialDate = format(new Date(invoice.createdAt), 'd-MMM-yy');

  const [data, setData] = useState({
    // Seller
    sellerName: 'OM SAKTHI MODERN RICE MILL',
    sellerAddress1: 'OLDBATTAI STREET,',
    sellerAddress2: 'KARUNGUZHI,',
    sellerAddress3: 'CHENGALPATTU - 603303',
    sellerFssai: 'FSSAI-12418008000259',
    sellerGstin: 'GSTIN/UIN: 33BCXPS5081B1ZB',
    sellerState: 'State Name : Tamil Nadu, Code : 33',
    
    // Buyer
    buyerName: invoice.customer.name,
    buyerAddress: invoice.customer.address || '',
    buyerGstin: invoice.customer.gstin || 'URD',
    buyerState: 'State Name : Tamil Nadu, Code : 33',

    // Details
    invoiceNumber: invoice.invoiceNumber,
    date: initialDate,
    deliveryNote: invoice.deliveryNote || '',
    modeOfPayment: invoice.modeOfPayment || '',
    buyersOrderNo: invoice.buyersOrderNo || '',
    buyerOrderDate: '',
    dispatchDocNo: invoice.dispatchDocNo || '',
    deliveryNoteDate: '',
    dispatchedThrough: 'ROAD',
    destination: invoice.destination || '',
    ladingNo: `dt. ${initialDate}`,
    vehicleNo: invoice.vehicleNo || invoice.vehicle?.licensePlate || '',
    termsOfDelivery: invoice.termsOfDelivery || '',
    otherReferences: invoice.otherReferences || '',
    
    // Items (uses packingItemName from backend fix!)
    items: invoice.items.map((item: any) => {
      const bags = calculateBags(item);
      const isKg = item.product.unit === 'KG';
      const bagWeight = isKg && bags > 0 ? Number(item.quantity)/bags : 0;
      return {
        id: item.id,
        description: item.packingItemName ? item.packingItemName.toUpperCase() : `PACKAGING MATERIAL`,
        hsn: item.product.hsnCode || (item.product.name.toLowerCase().includes('paddy') || (item.packingItemName?.toLowerCase().includes('paddy')) ? '10061010' : '10063010'),
        quantity: `${bags} BAG`,
        rate: Number(item.rate).toFixed(2),
        per: 'BAG',
        amount: Number(item.lineTotal).toFixed(2)
      };
    }),

    // Totals & Bank
    subtotal: Number(invoice.subtotal).toFixed(2),
    totalBags: invoice.items.reduce((sum: number, item: any) => sum + calculateBags(item), 0).toString() + ' BAG',
    bankName: 'KARUR VYSYA BANK',
    bankAc: '1682257000000052',
    bankIfsc: 'MADURANTAKAM & KVBL0001682',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...data.items];
    const updatedItem = { ...newItems[index], [field]: value };
    
    // Auto-calculate amount if quantity or rate changes
    if (field === 'quantity' || field === 'rate') {
      const qNum = parseFloat(updatedItem.quantity.toString().replace(/[^0-9.]/g, '')) || 0;
      const rNum = parseFloat(updatedItem.rate.toString().replace(/[^0-9.]/g, '')) || 0;
      updatedItem.amount = (qNum * rNum).toFixed(2);
    }
    
    newItems[index] = updatedItem;

    // Recalculate global Subtotal and Total Bags
    let newSubtotal = 0;
    let newTotalBags = 0;
    newItems.forEach(item => {
      newSubtotal += parseFloat(item.amount.toString().replace(/[^0-9.]/g, '')) || 0;
      newTotalBags += parseFloat(item.quantity.toString().replace(/[^0-9.]/g, '')) || 0;
    });

    setData({ 
      ...data, 
      items: newItems,
      subtotal: newSubtotal.toFixed(2),
      totalBags: `${newTotalBags} BAG`
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateInvoiceDetailsAction(invoice.id, {
        deliveryNote: data.deliveryNote,
        modeOfPayment: data.modeOfPayment,
        buyersOrderNo: data.buyersOrderNo,
        dispatchDocNo: data.dispatchDocNo,
        destination: data.destination,
        termsOfDelivery: data.termsOfDelivery,
        otherReferences: data.otherReferences,
        vehicleNo: data.vehicleNo,
        items: data.items.map((i: any) => ({ id: i.id, description: i.description }))
      });
      toast.success("Invoice Details Saved!");
    } catch (e) {
      toast.error("Failed to save.");
    }
    setIsSaving(false);
  };

  const generatePDF = async () => {
    const element = document.getElementById('invoice-print-area');
    if (!element) throw new Error("Element not found");
    
    // Switch to modern html-to-image which natively supports SVG rendering and doesn't crash on modern CSS like lab() or oklch()
    const htmlToImageModule = await import('html-to-image');
    
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.jsPDF;

    element.setAttribute('data-exporting', 'true');
    // Wait a brief moment for the DOM to apply the CSS removal
    await new Promise(r => setTimeout(r, 50));

    try {
      const imgData = await htmlToImageModule.toJpeg(element, { 
        quality: 0.98,
        pixelRatio: 2, 
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      return { pdf, filename: `Invoice_${data.invoiceNumber}.pdf` };
    } catch (e: any) {
      throw new Error(e.message || "Failed to generate PDF image");
    } finally {
      element.removeAttribute('data-exporting');
    }
  };

  const handleDownloadPDF = async () => {
    let filename = window.prompt("Enter a name for this PDF file:", `Invoice_${data.invoiceNumber}`);
    if (filename === null) return; // User clicked Cancel
    if (!filename.trim()) filename = `Invoice_${data.invoiceNumber}`;
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    toast.info("Generating High-Quality PDF...");
    try {
      const { pdf } = await generatePDF();
      pdf.save(filename);
      toast.success("PDF Downloaded successfully!");
    } catch (err: any) {
      toast.error(`Error: ${err?.message || 'Unknown error'}`);
      console.error(err);
    }
  };

  const handleSharePDF = async () => {
    let filename = window.prompt("Enter a name for this PDF file:", `Invoice_${data.invoiceNumber}`);
    if (filename === null) return; // User clicked Cancel
    if (!filename.trim()) filename = `Invoice_${data.invoiceNumber}`;
    if (!filename.toLowerCase().endsWith('.pdf')) filename += '.pdf';

    toast.info("Preparing PDF for sharing...");
    try {
      const { pdf } = await generatePDF();
      
      // Convert the generated PDF to a physical File object
      const blob = pdf.output('blob');
      const file = new File([blob], filename, { type: 'application/pdf' });
      
      // Check if the device/browser supports native file sharing (Mobile / Modern Desktop)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Invoice ${data.invoiceNumber}`,
          text: `*Bill of Supply - ${data.sellerName}*\nInvoice No: ${data.invoiceNumber}`,
          files: [file]
        });
        toast.success("Shared successfully!");
      } else {
        // Fallback for desktops or HTTP IP testing
        toast.warning("Direct file sharing not supported on this browser. Downloading PDF so you can attach it!");
        
        // Auto download
        pdf.save(filename);

        // Open WhatsApp Web with a text prompt so they can just drag-and-drop the downloaded PDF
        let text = `*Bill of Supply - ${data.sellerName}*\n`;
        text += `Invoice No: ${data.invoiceNumber} | Date: ${data.date}\n\n`;
        text += `*Buyer:* ${data.buyerName}\n`;
        text += `GSTIN: ${data.buyerGstin}\n\n`;
        text += `Please find the attached PDF bill.`;
        
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
      }
    } catch (err: any) {
      toast.error("Error sharing PDF");
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-2 sm:p-4 print:p-0 print:bg-white flex flex-col items-center font-sans">
      
      {/* Action Bar (Static at top, hidden when printing) */}
      <div className="print:hidden w-full max-w-4xl bg-white p-3 sm:p-4 rounded shadow-lg border border-gray-300 mb-4 sm:mb-8 flex flex-wrap gap-2 sm:gap-4 justify-between items-center z-20">
        <button onClick={() => router.back()} className="flex items-center px-3 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300">
          <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="flex gap-2 ml-auto">
          <button onClick={() => router.push(`/operator/sales?editInvoiceId=${invoice.id}`)} className="flex items-center px-3 py-2 bg-amber-500 text-black rounded font-bold hover:bg-amber-600 shadow">
            <Edit3 className="w-4 h-4 sm:mr-2" /> <span className="hidden lg:inline">Edit Items</span>
          </button>
          <button onClick={handleSharePDF} className="flex items-center px-3 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 shadow">
            <Share2 className="w-4 h-4 sm:mr-2" /> <span className="hidden lg:inline">Share PDF</span>
          </button>
          <button onClick={handleSave} disabled={isSaving} className="flex items-center px-3 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow">
            <Save className="w-4 h-4 sm:mr-2" /> <span className="hidden lg:inline">{isSaving ? 'Saving' : 'Save'}</span>
          </button>
          <button onClick={handleDownloadPDF} className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 shadow">
            <Download className="w-4 h-4 sm:mr-2" /> <span className="hidden lg:inline">Download PDF</span>
          </button>
          <button onClick={() => window.print()} className="flex items-center px-3 py-2 bg-black text-white rounded font-bold hover:bg-gray-800 shadow">
            <Printer className="w-4 h-4 sm:mr-2" /> <span className="hidden lg:inline">Print PDF</span>
          </button>
        </div>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <button 
        onClick={() => setIsMobileWizardOpen(true)}
        className="md:hidden print:hidden fixed bottom-6 right-6 z-50 bg-black text-white p-4 rounded-full shadow-[4px_4px_0px_var(--gold)] flex items-center justify-center border-2 border-black hover:scale-105 active:scale-95 transition-transform"
      >
        <Edit3 className="w-6 h-6" />
      </button>

      {/* MOBILE WIZARD OVERLAY */}
      {isMobileWizardOpen && (
        <div className="md:hidden print:hidden fixed inset-0 h-[100dvh] z-[100] bg-white flex flex-col font-sans text-black">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Step {wizardStep} of 5</span>
              <span className="font-black text-lg">
                {wizardStep === 1 && "Seller Details"}
                {wizardStep === 2 && "Buyer Details"}
                {wizardStep === 3 && "Invoice Details"}
                {wizardStep === 4 && "Line Items"}
                {wizardStep === 5 && "Bank & Totals"}
              </span>
            </div>
            <button onClick={() => setIsMobileWizardOpen(false)} className="p-2 border-2 border-black rounded shadow-[2px_2px_0px_#000] bg-white hover:bg-gray-100 active:translate-y-[2px] active:shadow-none">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="h-2 w-full bg-gray-200">
            <div className="h-full bg-[var(--gold)] transition-all duration-300" style={{ width: `${(wizardStep / 5) * 100}%` }}></div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 bg-gray-100 hide-scrollbar pb-24">
            
            {wizardStep === 1 && (
              <div className="animate-fade-in flex flex-col gap-4">
                <MobileInput label="Seller Name" name="sellerName" value={data.sellerName} onChange={handleChange} />
                <MobileInput label="Address Line 1" name="sellerAddress1" value={data.sellerAddress1} onChange={handleChange} />
                <MobileInput label="GSTIN" name="sellerGstin" value={data.sellerGstin} onChange={handleChange} />
                <MobileInput label="FSSAI" name="sellerFssai" value={data.sellerFssai} onChange={handleChange} />
              </div>
            )}

            {wizardStep === 2 && (
              <div className="animate-fade-in flex flex-col gap-4">
                <MobileInput label="Buyer Name" name="buyerName" value={data.buyerName} onChange={handleChange} />
                <MobileInput label="Address" name="buyerAddress" value={data.buyerAddress} onChange={handleChange} />
                <MobileInput label="GSTIN" name="buyerGstin" value={data.buyerGstin} onChange={handleChange} placeholder="URD" />
                <MobileInput label="State & Code" name="buyerState" value={data.buyerState} onChange={handleChange} />
              </div>
            )}

            {wizardStep === 3 && (
              <div className="animate-fade-in flex flex-col gap-4">
                <MobileInput label="Invoice No." name="invoiceNumber" value={data.invoiceNumber} onChange={handleChange} />
                <MobileInput label="Date" name="date" value={data.date} onChange={handleChange} />
                <MobileInput label="Delivery Note" name="deliveryNote" value={data.deliveryNote} onChange={handleChange} />
                <MobileInput label="Vehicle No." name="vehicleNo" value={data.vehicleNo} onChange={handleChange} />
                <MobileInput label="Destination" name="destination" value={data.destination} onChange={handleChange} />
                <MobileInput label="Payment Mode" name="modeOfPayment" value={data.modeOfPayment} onChange={handleChange} />
              </div>
            )}

            {wizardStep === 4 && (
              <div className="animate-fade-in flex flex-col gap-5">
                {data.items.map((item: any, idx: number) => (
                  <div key={item.id} className="card-brutal p-4 bg-white relative">
                    <div className="absolute -top-3 -left-3 bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-[2px_2px_0px_#000]">
                      {idx + 1}
                    </div>
                    <label className="block text-xs font-black text-gray-500 mb-2 uppercase tracking-wide mt-2">Description</label>
                    <textarea 
                      value={item.description} 
                      onChange={(e) => handleItemChange(idx, 'description', e.target.value)} 
                      className="input-brutal mb-4 resize-none h-20 uppercase font-bold" 
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Quantity</label>
                        <input value={item.quantity} onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)} className="input-brutal" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Rate</label>
                        <input value={item.rate} onChange={(e) => handleItemChange(idx, 'rate', e.target.value)} className="input-brutal" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black text-gray-500 mb-1 uppercase">Amount</label>
                        <input value={item.amount} onChange={(e) => handleItemChange(idx, 'amount', e.target.value)} className="input-brutal" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {wizardStep === 5 && (
              <div className="animate-fade-in flex flex-col gap-4">
                <MobileInput label="Subtotal (Rs.)" name="subtotal" value={data.subtotal} onChange={handleChange} />
                <MobileInput label="Total Bags" name="totalBags" value={data.totalBags} onChange={handleChange} />
                <hr className="border-t-2 border-black my-2 opacity-20" />
                <MobileInput label="Bank Name" name="bankName" value={data.bankName} onChange={handleChange} />
                <MobileInput label="Account No." name="bankAc" value={data.bankAc} onChange={handleChange} />
                <MobileInput label="IFSC Code" name="bankIfsc" value={data.bankIfsc} onChange={handleChange} />
              </div>
            )}

          </div>

          {/* Footer Controls */}
          <div className="p-4 border-t-2 border-black bg-white flex justify-between gap-4">
            <button 
              onClick={() => wizardStep > 1 ? setWizardStep(step => step - 1) : setIsMobileWizardOpen(false)}
              className="flex-1 py-3 px-4 border-2 border-black rounded font-bold text-center flex justify-center items-center gap-2 hover:bg-gray-100 active:translate-y-[2px]"
            >
              {wizardStep > 1 ? <ChevronLeft className="w-5 h-5" /> : null}
              {wizardStep > 1 ? "Back" : "Cancel"}
            </button>
            <button 
              onClick={() => wizardStep < 5 ? setWizardStep(step => step + 1) : setIsMobileWizardOpen(false)}
              className="flex-1 py-3 px-4 bg-black text-white border-2 border-black rounded font-bold text-center flex justify-center items-center gap-2 shadow-[3px_3px_0px_var(--gold)] active:translate-y-[2px] active:shadow-none transition-all"
            >
              {wizardStep < 5 ? "Next" : "Done"}
              {wizardStep < 5 ? <ChevronRight className="w-5 h-5" /> : <Check className="w-5 h-5" />}
            </button>
          </div>
        </div>
      )}


      {/* A4 INVOICE CONTAINER (Visible everywhere, horizontally scrollable on mobile!) */}
      <div className="w-full overflow-x-auto bg-gray-100 print:bg-white py-8 print:py-0 print:overflow-visible mt-8 md:mt-0 print:mt-0">
        
        {/* Shadow Wrapper (excluded from PDF) */}
        <div className="mx-auto shadow-2xl print:shadow-none bg-white" style={{ width: '210mm' }}>
          
          {/* Actual Print Area (Exactly A4 dimensions) */}
          <div 
            id="invoice-print-area" 
            className="flex flex-col box-border relative overflow-hidden bg-white text-black"
            style={{ 
              width: '210mm', 
              minHeight: '295mm', // Slightly less than 297mm to prevent 2nd page bleed in native print
              padding: '10mm',
              fontSize: '12px',
              lineHeight: '1.2'
            }}
          >
            <h1 className="text-center font-bold text-xl mb-2 uppercase">
              Bill of Supply
              {invoice.isModified && <span className="ml-2 text-xs text-gray-500 font-bold border border-gray-500 px-1 rounded align-middle">MODIFIED</span>}
            </h1>
            
            {/* THIS is the main outer border of the invoice format they want, with NO extra padding wrapping it */}
            <div className="border border-black flex flex-col flex-1 relative z-10 bg-white">
              
              {/* Top Section: Seller and Details */}
              <div className="flex border-b border-black">
                {/* Left Col: Seller */}
                <div className="w-1/2 border-r border-black flex flex-col justify-between">
                  <div className="p-2">
                    <A4Input name="sellerName" value={data.sellerName} onChange={handleChange} className="font-bold text-sm w-full uppercase" />
                    <A4Input name="sellerAddress1" value={data.sellerAddress1} onChange={handleChange} className="w-full uppercase" />
                    <A4Input name="sellerAddress2" value={data.sellerAddress2} onChange={handleChange} className="w-full uppercase" />
                    <A4Input name="sellerAddress3" value={data.sellerAddress3} onChange={handleChange} className="w-full uppercase" />
                    <A4Input name="sellerFssai" value={data.sellerFssai} onChange={handleChange} className="w-full uppercase" />
                    <A4Input name="sellerGstin" value={data.sellerGstin} onChange={handleChange} className="w-full uppercase" />
                    <A4Input name="sellerState" value={data.sellerState} onChange={handleChange} className="w-full uppercase" />
                  </div>
                  <div className="border-t border-black p-2">
                    <div className="text-[10px]">Buyer (Bill to)</div>
                    <A4Input name="buyerName" value={data.buyerName} onChange={handleChange} className="font-bold text-sm w-full uppercase" />
                    <A4Input name="buyerAddress" value={data.buyerAddress} onChange={handleChange} className="w-full uppercase" />
                    <div className="mt-1 flex w-full items-center">
                      <span className="w-16">GSTIN/UIN</span> 
                      <span className="flex-1 flex">: <A4Input name="buyerGstin" value={data.buyerGstin} onChange={handleChange} className="ml-1 flex-1 uppercase" /></span>
                    </div>
                    <A4Input name="buyerState" value={data.buyerState} onChange={handleChange} className="w-full uppercase" />
                  </div>
                </div>

                {/* Right Col: Invoice Meta */}
                <div className="w-1/2 flex flex-col">
                  <div className="flex border-b border-black">
                    <div className="w-1/2 p-1 border-r border-black">
                      <div className="text-[10px]">Invoice No.</div>
                      <A4Input name="invoiceNumber" value={data.invoiceNumber} onChange={handleChange} className="font-bold" />
                    </div>
                    <div className="w-1/2 p-1">
                      <div className="text-[10px]">Dated</div>
                      <A4Input name="date" value={data.date} onChange={handleChange} className="font-bold" />
                    </div>
                  </div>

                  <div className="flex border-b border-black">
                    <div className="w-1/2 p-1 border-r border-black flex flex-col">
                      <div className="text-[10px]">Delivery Note</div>
                      <A4Input name="deliveryNote" value={data.deliveryNote} onChange={handleChange} className="font-bold flex-1" />
                    </div>
                    <div className="w-1/2 p-1 flex flex-col">
                      <div className="text-[10px]">Mode/Terms of Payment</div>
                      <A4Input name="modeOfPayment" value={data.modeOfPayment} onChange={handleChange} className="font-bold flex-1" />
                    </div>
                  </div>
                  
                  <div className="flex border-b border-black">
                    <div className="w-1/2 p-1 border-r border-black flex flex-col">
                      <div className="text-[10px]">Reference No. & Date.</div>
                      <A4Input name="otherReferences" value={data.otherReferences} onChange={handleChange} className="font-bold flex-1" />
                    </div>
                    <div className="w-1/2 p-1 flex flex-col">
                      <div className="text-[10px]">Other References</div>
                      <input className="w-full bg-transparent outline-none" disabled />
                    </div>
                  </div>

                  <div className="flex border-b border-black">
                    <div className="w-1/2 p-1 border-r border-black flex flex-col">
                      <div className="text-[10px]">Buyer&apos;s Order No.</div>
                      <A4Input name="buyersOrderNo" value={data.buyersOrderNo} onChange={handleChange} className="font-bold flex-1" />
                    </div>
                    <div className="w-1/2 p-1 flex flex-col">
                      <div className="text-[10px]">Dated</div>
                      <A4Input name="buyerOrderDate" value={data.buyerOrderDate} onChange={handleChange} className="font-bold flex-1" />
                    </div>
                  </div>

                  <div className="flex border-b border-black">
                    <div className="w-1/2 p-1 border-r border-black flex flex-col">
                      <div className="text-[10px]">Dispatch Doc No.</div>
                      <A4Input name="dispatchDocNo" value={data.dispatchDocNo} onChange={handleChange} className="font-bold flex-1" />
                    </div>
                    <div className="w-1/2 p-1 flex flex-col">
                      <div className="text-[10px]">Delivery Note Date</div>
                      <A4Input name="deliveryNoteDate" value={data.deliveryNoteDate} onChange={handleChange} className="font-bold flex-1" />
                    </div>
                  </div>

                  <div className="flex border-b border-black">
                    <div className="w-1/2 p-1 border-r border-black">
                      <div className="text-[10px]">Dispatched through</div>
                      <A4Input name="dispatchedThrough" value={data.dispatchedThrough} onChange={handleChange} className="font-bold mt-1 uppercase" />
                    </div>
                    <div className="w-1/2 p-1 flex flex-col">
                      <div className="text-[10px]">Destination</div>
                      <A4Input name="destination" value={data.destination} onChange={handleChange} className="font-bold flex-1 uppercase" />
                    </div>
                  </div>
                  
                  <div className="flex border-b border-black">
                    <div className="w-1/2 p-1 border-r border-black">
                      <div className="text-[10px]">Bill of Lading/LR-RR No.</div>
                      <A4Input name="ladingNo" value={data.ladingNo} onChange={handleChange} className="font-bold mt-1" />
                    </div>
                    <div className="w-1/2 p-1 flex flex-col">
                      <div className="text-[10px]">Motor Vehicle No.</div>
                      <A4Input name="vehicleNo" value={data.vehicleNo} onChange={handleChange} className="font-bold flex-1 uppercase" />
                    </div>
                  </div>

                  <div className="p-1 flex-1 flex flex-col">
                    <div className="text-[10px]">Terms of Delivery</div>
                    <textarea name="termsOfDelivery" value={data.termsOfDelivery} onChange={handleChange} className="w-full h-full min-h-[40px] font-bold outline-none border-none resize-none bg-transparent print:min-h-0 focus:bg-blue-50 print:focus:bg-transparent" />
                  </div>

                </div>
              </div>

              {/* Table */}
              <div className="w-full flex-1 flex flex-col relative">
                
                {/* Background Lines (Guaranteed 100% height!) */}
                <div className="absolute inset-0 flex pointer-events-none z-0">
                  <div className="w-8 border-r border-black h-full"></div>
                  <div className="flex-1 border-r border-black h-full"></div>
                  <div className="w-20 border-r border-black h-full"></div>
                  <div className="w-20 border-r border-black h-full"></div>
                  <div className="w-20 border-r border-black h-full"></div>
                  <div className="w-12 border-r border-black h-full"></div>
                  <div className="w-28 h-full"></div>
                </div>

                {/* Table Content (z-10 on top of background lines) */}
                <div className="relative z-10 flex flex-col flex-1">
                  
                  {/* Header */}
                  <div className="flex border-b border-black text-center font-bold items-center bg-transparent">
                    <div className="w-8 py-1 h-full border-r border-black">SI<br/>No.</div>
                    <div className="flex-1 py-1 h-full border-r border-black">Description of Goods</div>
                    <div className="w-20 py-1 h-full border-r border-black">HSN/SAC</div>
                    <div className="w-20 py-1 h-full border-r border-black">Quantity</div>
                    <div className="w-20 py-1 h-full border-r border-black">Rate</div>
                    <div className="w-12 py-1 h-full border-r border-black">per</div>
                    <div className="w-28 py-1 h-full">Amount</div>
                  </div>

                  {/* Rows Area (Fills space, pushing totals down) */}
                  <div className="flex-1 pb-8 pt-2 min-h-[200px]">
                    {data.items.map((item: any, idx: number) => (
                      <div key={item.id} className="flex font-bold">
                        <div className="w-8 text-center">{idx + 1}</div>
                        <div className="flex-1 px-1">
                          <textarea 
                            value={item.description} 
                            onChange={(e) => handleItemChange(idx, 'description', e.target.value)} 
                            className="w-full uppercase bg-transparent outline-none border-b border-dashed border-gray-300 print:border-none focus:bg-blue-50 print:focus:bg-transparent resize-none overflow-hidden" 
                            rows={2}
                          />
                        </div>
                        <div className="w-20 px-1"><A4Input value={item.hsn} onChange={(e: any) => handleItemChange(idx, 'hsn', e.target.value)} className="text-center" /></div>
                        <div className="w-20 px-1"><A4Input value={item.quantity} onChange={(e: any) => handleItemChange(idx, 'quantity', e.target.value)} className="text-center" /></div>
                        <div className="w-20 px-1"><A4Input value={item.rate} onChange={(e: any) => handleItemChange(idx, 'rate', e.target.value)} className="text-center" /></div>
                        <div className="w-12 px-1"><A4Input value={item.per} onChange={(e: any) => handleItemChange(idx, 'per', e.target.value)} className="text-center" /></div>
                        <div className="w-28 px-1"><A4Input value={item.amount} onChange={(e: any) => handleItemChange(idx, 'amount', e.target.value)} className="text-right" /></div>
                      </div>
                    ))}
                  </div>

                  {/* Totals Row */}
                  <div className="flex border-y border-black font-bold mt-auto">
                    <div className="w-8 py-1"></div>
                    <div className="flex-1 text-right pr-2 py-1">Total</div>
                    <div className="w-20 py-1"></div>
                    <div className="w-20 text-center py-1 font-bold">
                      <A4Input name="totalBags" value={data.totalBags} onChange={handleChange} className="text-center font-bold" />
                    </div>
                    <div className="w-20 py-1"></div>
                    <div className="w-12 py-1"></div>
                    <div className="w-28 text-right pr-1 py-1 flex font-bold text-sm">₹ <A4Input name="subtotal" value={data.subtotal} onChange={handleChange} className="text-right flex-1 font-bold text-sm" /></div>
                  </div>

                </div>
              </div>

              {/* Footer Box */}
              <div className="flex">
                <div className="w-3/5 p-2 flex flex-col justify-between">
                  <div>
                    <div className="text-[10px]">Amount Chargeable (in words)</div>
                    <div className="font-bold text-sm">INR {numberToWords(Number(data.subtotal))}</div>
                  </div>
                  <div className="mt-4">
                    <div className="text-[10px] underline">Declaration</div>
                    <div className="text-[10px]">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
                  </div>
                </div>

                <div className="w-2/5 flex flex-col justify-between">
                  <div className="p-2">
                    <div className="text-right text-[10px] font-bold mb-2 pr-2">E. & O.E</div>
                    <div>
                      <div className="text-[10px]">Company's Bank Details</div>
                      <div className="flex text-[11px]"><span className="w-[95px] shrink-0">Bank Name</span> <span className="font-bold flex-1 flex">: <A4Input name="bankName" value={data.bankName} onChange={handleChange} className="ml-1 flex-1" /></span></div>
                      <div className="flex text-[11px]"><span className="w-[95px] shrink-0">A/c No.</span> <span className="font-bold flex-1 flex">: <A4Input name="bankAc" value={data.bankAc} onChange={handleChange} className="ml-1 flex-1" /></span></div>
                      <div className="flex text-[11px] items-start"><span className="w-[95px] leading-tight shrink-0">Branch & IFS<br/>Code</span> <span className="font-bold flex-1 flex items-start">: <textarea name="bankIfsc" value={data.bankIfsc} onChange={handleChange} className="ml-1 flex-1 bg-transparent outline-none border-b border-dashed border-gray-300 print:border-none focus:border-blue-400 focus:bg-blue-50 print:focus:bg-transparent resize-none overflow-hidden h-8" /></span></div>
                    </div>
                  </div>
                  <div className="mt-4 pt-1 flex flex-col h-16 border-t border-l border-black w-4/5 ml-auto p-2">
                    <div className="text-right text-[10px] font-bold">for OM SAKTHI MODERN RICE MILL</div>
                    <div className="text-right text-[10px] mt-auto">Authorised Signatory</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center text-[10px] mt-1">This is a Computer Generated Invoice</div>
          </div>
        </div>
      </div>
    </div>
  );
}
