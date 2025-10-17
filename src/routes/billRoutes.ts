// @ts-nocheck
import express from "express";
import { billController } from "../controllers/BillController";
import { authenticate } from "../middleware/authenticate";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Create a new bill
router.post("/", (req, res, next) => billController.createBill(req, res, next));

// Get bills by matter ID (with expenses included)
router.get("/matter/:matterId", (req, res, next) => billController.getBillsByMatterId(req, res, next));

// Get a single bill by ID (with expenses included)
router.get("/:id", (req, res, next) => billController.getBillById(req, res, next));

// Get all bills for the authenticated user
router.get("/", (req, res, next) => billController.getUserBills(req, res, next));

// Update bill
router.put("/:id", (req, res, next) => billController.updateBill(req, res, next));

// Update bill status
router.patch("/:id/status", (req, res, next) => billController.updateBillStatus(req, res, next));

// Add expense to bill
router.post("/:id/expenses", (req, res, next) => billController.addExpense(req, res, next));

// Delete bill
router.delete("/:id", (req, res, next) => billController.deleteBill(req, res, next));

export default router;




