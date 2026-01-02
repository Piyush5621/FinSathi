import { SummaryService } from "../services/SummaryService.js";

/** Generate Smart Business Summary */
export const getSmartSummary = async (req, res) => {
  try {
    const summary = await SummaryService.getSmartSummary();
    res.status(200).json(summary);
  } catch (err) {
    console.error("Summary Error:", err.message);
    res.status(500).json({ message: "Failed to generate summary" });
  }
};
