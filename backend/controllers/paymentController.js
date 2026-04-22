const { getStudentByUserId } = require("../config/googleSheets");

async function getPaymentSummary(req, res) {
  try {
    const student = await getStudentByUserId(req.user.userId);

    if (!student) {
      return res.status(404).json({ error: "Student data not found" });
    }

    const paymentMode = student["Payment_Plan_Type"] || "";

    const summary = {
      studentName: student["Student Name"],
      programme: student["Programme"],
      productCode: student["Product code"],
      lpoad: student["LPOAD"],
      paymentPlanType: paymentMode,
      productStatus: student["product_status"],
      totalProgrammeFee: student["Total Programme Fee"],
      discountApplied: student["Discount Applied"],
      totalFeePayable: student["Total Fee Payble"],
      amountPaidInFlex: student["Amount Paid in Jodo Flex"],
      amountPaidToNxtWave: student["Amount Paid to NxtWave"],
      nbfcLoanAmountCovered: student["Nbfc Loan Amount Covered"],
      totalAmountCovered: student["Total Amoubt Covered"],
      remainingAmountToPay: student["Remaining Amount to Pay"],
      flexCurrentStatus: student["Flex current status"],
    };

    res.json(summary);
  } catch (error) {
    console.error("Payment summary error:", error.message);
    res.status(500).json({ error: "Failed to fetch payment summary" });
  }
}

async function getNBFCDetails(req, res) {
  try {
    const student = await getStudentByUserId(req.user.userId);

    if (!student) {
      return res.status(404).json({ error: "Student data not found" });
    }

    const nbfcDetails = {
      currentNBFC: student["Current NBFC"],
      currentNBFCStatus: student["Current NBFC Status"],
      nbfc1: {
        name: student["NBFC 1_Name"],
        status: student["NBFC 1_Status"],
        loanAmount: student["NBFC 1_Loan Amount"],
        loanTenure: student["NBFC 1_Loan Tenure"],
        emiAmount: student["NBFC 1_EMI Amount"],
      },
      nbfc2: {
        name: student["NBFC 2_Name"],
        status: student["NBFC 2_Status"],
        loanAmount: student["NBFC 2_Loan Amount"],
        loanTenure: student["NBFC 2_Loan Tenure"],
        emiAmount: student["NBFC 2_EMI Amount"],
      },
    };

    res.json(nbfcDetails);
  } catch (error) {
    console.error("NBFC details error:", error.message);
    res.status(500).json({ error: "Failed to fetch NBFC details" });
  }
}

module.exports = { getPaymentSummary, getNBFCDetails };
