// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { Bill, Expense } from "../models/Bill";
import { User } from "../models/User";
import { Property } from "../models/Property";
import { Types } from "mongoose";

export class BillController {

  // Create a new bill
  async createBill(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      // Generate unique bill number
      const billNumber = await this.generateBillNumber();

      const billData = {
        ...req.body,
        billNumber,
        createdBy: userId,
        lastModifiedBy: userId
      };

      // Calculate total amount from expenses
      if (billData.expenses && billData.expenses.length > 0) {
        billData.totalAmount = billData.expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
      }

      const bill = new Bill(billData);
      const savedBill = await bill.save();

      // Populate references
      const populatedBill = await Bill.findById(savedBill._id)
        .populate("clientId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .populate("createdBy", "firstName lastName email");

      res.status(201).json({
        success: true,
        message: "Bill created successfully",
        data: populatedBill
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get bills by matter ID with expenses
  async getBillsByMatterId(req: Request, res: Response, next: NextFunction) {
    try {
      const { matterId } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      // Build query based on user role
      let query: any = { matterId };
      
      if (userRole === "landlord") {
        query.createdBy = userId;
      } else if (userRole === "tenant") {
        query.clientId = userId;
      }

      const bills = await Bill.find(query)
        .populate("clientId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .populate("createdBy", "firstName lastName email")
        .sort({ billDate: -1 });

      res.status(200).json({
        success: true,
        data: bills
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get a single bill by ID with expenses
  async getBillById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid bill ID" });
      }

      const bill = await Bill.findById(id)
        .populate("clientId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .populate("createdBy", "firstName lastName email");

      if (!bill) {
        return res.status(404).json({ success: false, message: "Bill not found" });
      }

      // Check access permissions
      if (userRole === "landlord" && bill.createdBy.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
      if (userRole === "tenant" && bill.clientId.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      res.status(200).json({
        success: true,
        data: bill
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Update bill
  async updateBill(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;
      const updateData = req.body;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid bill ID" });
      }

      const bill = await Bill.findById(id);
      if (!bill) {
        return res.status(404).json({ success: false, message: "Bill not found" });
      }

      // Check if user can update this bill
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (bill.createdBy.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You can only update your own bills"
        });
      }

      // Recalculate total amount if expenses are updated
      if (updateData.expenses && updateData.expenses.length > 0) {
        updateData.totalAmount = updateData.expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
      }

      updateData.lastModifiedBy = userId;

      const updatedBill = await Bill.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("clientId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .populate("createdBy", "firstName lastName email");

      res.status(200).json({
        success: true,
        message: "Bill updated successfully",
        data: updatedBill
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Delete bill
  async deleteBill(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).user._id;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid bill ID" });
      }

      const bill = await Bill.findById(id);
      if (!bill) {
        return res.status(404).json({ success: false, message: "Bill not found" });
      }

      // Check if user can delete this bill
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (bill.createdBy.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own bills"
        });
      }

      await Bill.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        message: "Bill deleted successfully"
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Get all bills for a user
  async getUserBills(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user._id;
      const userRole = (req as any).user.role;
      const { status, matterId } = req.query;

      // Build query based on user role
      let query: any = {};
      
      if (userRole === "landlord") {
        query.createdBy = userId;
      } else if (userRole === "tenant") {
        query.clientId = userId;
      }

      if (status) {
        query.status = status;
      }

      if (matterId) {
        query.matterId = matterId;
      }

      const bills = await Bill.find(query)
        .populate("clientId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .populate("createdBy", "firstName lastName email")
        .sort({ billDate: -1 });

      res.status(200).json({
        success: true,
        data: bills
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Update bill status
  async updateBillStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, paymentStatus } = req.body;
      const userId = (req as any).user._id;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid bill ID" });
      }

      const bill = await Bill.findById(id);
      if (!bill) {
        return res.status(404).json({ success: false, message: "Bill not found" });
      }

      // Check permissions
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (bill.createdBy.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You can only update your own bills"
        });
      }

      const updateData: any = { lastModifiedBy: userId };
      
      if (status) {
        updateData.status = status;
      }
      
      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus;
        if (paymentStatus === "paid") {
          updateData.paidAt = new Date();
        }
      }

      const updatedBill = await Bill.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      )
        .populate("clientId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .populate("createdBy", "firstName lastName email");

      res.status(200).json({
        success: true,
        message: "Bill status updated successfully",
        data: updatedBill
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Add expense to bill
  async addExpense(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const expenseData = req.body;
      const userId = (req as any).user._id;

      if (!Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: "Invalid bill ID" });
      }

      const bill = await Bill.findById(id);
      if (!bill) {
        return res.status(404).json({ success: false, message: "Bill not found" });
      }

      // Check permissions
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if (bill.createdBy.toString() !== userId.toString() && user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "You can only update your own bills"
        });
      }

      // Add expense to bill
      bill.expenses.push(expenseData);
      
      // Recalculate total amount
      bill.totalAmount = bill.expenses.reduce((sum, expense) => sum + expense.amount, 0);
      bill.lastModifiedBy = userId;

      await bill.save();

      const updatedBill = await Bill.findById(id)
        .populate("clientId", "firstName lastName email phone")
        .populate("propertyId", "title address")
        .populate("createdBy", "firstName lastName email");

      res.status(200).json({
        success: true,
        message: "Expense added successfully",
        data: updatedBill
      });
    } catch (error: any) {
      next(error);
    }
  }

  // Generate unique bill number
  private async generateBillNumber(): Promise<string> {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    
    // Find the highest bill number for this month
    const prefix = `BILL-${year}${month}`;
    const lastBill = await Bill.findOne({
      billNumber: { $regex: `^${prefix}` }
    }).sort({ billNumber: -1 });

    let sequence = 1;
    if (lastBill) {
      const lastSequence = parseInt(lastBill.billNumber.split('-')[2]) || 0;
      sequence = lastSequence + 1;
    }

    return `${prefix}-${String(sequence).padStart(4, '0')}`;
  }
}

export const billController = new BillController();




