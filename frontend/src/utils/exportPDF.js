import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

/**
 * Capture a full dashboard section as PDF
 * - Automatically splits into multiple pages if height > A4
 * - Adds FinSathi header + timestamp
 * - Preserves good quality using scale: 2
 * - Shows progress using toast notifications
 */
export async function exportElementToPDF(elementId, filename = "FinSathi-Report.pdf") {
  try {
    const toastId = toast.loading("Preparing dashboard for export...");
    
    const el = document.getElementById(elementId);
    if (!el) {
      toast.error("Could not find dashboard content to export");
      return;
    }

    toast.loading("Capturing dashboard content...", { id: toastId });
    // Create canvas from dashboard
    const canvas = await html2canvas(el, {
      scale: 2, // higher = sharper image
      useCORS: true,
      scrollY: -window.scrollY, // capture full viewport
    });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth - 40; // margins
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let position = 60; // start below header
  let heightLeft = imgHeight;

  // 🧾 Add FinSathi header with date
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text("FinSathi Business Report", 30, 30);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, 30, 45);

  // 🧠 Add dashboard image
  pdf.addImage(imgData, "PNG", 20, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - position;

  // Add new pages if needed
  while (heightLeft > 0) {
    position = 0;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 20, position - (imgHeight - heightLeft), imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

    // ✅ Save PDF
    toast.loading("Generating final PDF...", { id: toastId });
    pdf.save(filename);
    toast.success("Report downloaded successfully!", { id: toastId });
  } catch (error) {
    console.error("PDF export error:", error);
    toast.error("Failed to export dashboard: " + error.message);
  }
}
