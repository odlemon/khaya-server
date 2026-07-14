// @ts-nocheck
import { Request, Response, NextFunction } from "express";
import { PORTAL_PERMISSION_CATALOGS } from "../config/portalPermissions";
import { staffRoleService } from "../services/StaffRoleService";
import { staffUserService } from "../services/StaffUserService";
import type { PortalType } from "../config/portalPermissions";

export class StaffController {
  async getPermissionCatalog(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: PORTAL_PERMISSION_CATALOGS,
      });
    } catch (error) {
      next(error);
    }
  }

  async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const portal = req.query.portal as PortalType | undefined;
      const roles = await staffRoleService.listRoles(portal);
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }

  async createRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, portal, permissions } = req.body;
      const createdBy = (req as any).user?._id?.toString();

      const role = await staffRoleService.createRole({
        name,
        portal,
        permissions: permissions || [],
        createdBy,
      });

      res.status(201).json({
        success: true,
        message: "Staff role created",
        data: role,
      });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, permissions, isActive } = req.body;

      const role = await staffRoleService.updateRole(id, { name, permissions, isActive });
      if (!role) {
        return res.status(404).json({ success: false, message: "Role not found" });
      }

      res.json({ success: true, message: "Role updated", data: role });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async deactivateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await staffRoleService.deactivateRole(req.params.id);
      if (!result.success) {
        return res.status(400).json({ success: false, message: result.message });
      }
      res.json({ success: true, message: "Role deactivated" });
    } catch (error) {
      next(error);
    }
  }

  async listStaffUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const portal = req.query.portal as PortalType | undefined;
      const users = await staffUserService.listStaffUsers(portal);
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async createStaffUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { firstName, lastName, email, staffRoleId } = req.body;
      const createdByStaffId = (req as any).user?._id?.toString();

      const result = await staffUserService.createStaffUser({
        firstName,
        lastName,
        email,
        staffRoleId,
        createdByStaffId,
      });

      res.status(201).json({
        success: true,
        message: result.emailSent
          ? "Staff user created. Login credentials sent by email."
          : "Staff user created. Email delivery failed — credentials included in response as a fallback.",
        data: {
          user: result.user,
          emailSent: result.emailSent,
          // When email delivery succeeds, credentials are sent by email and are
          // intentionally NOT returned in the API response. They are only
          // included here as a recovery fallback if email delivery failed.
          ...(result.emailSent ? {} : { credentials: result.credentials }),
        },
      });
    } catch (error: any) {
      const status = error.message?.includes("already") ? 409 : 400;
      res.status(status).json({ success: false, message: error.message });
    }
  }

  async updateStaffUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { staffRoleId, isActive } = req.body;
      const user = await staffUserService.updateStaffUser(req.params.id, {
        staffRoleId,
        isActive,
      });

      if (!user) {
        return res.status(404).json({ success: false, message: "Staff user not found" });
      }

      res.json({ success: true, message: "Staff user updated", data: user });
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async resetStaffPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await staffUserService.resetStaffPassword(req.params.id);
      if (!result) {
        return res.status(404).json({ success: false, message: "Staff user not found" });
      }

      res.json({
        success: true,
        message: result.emailSent
          ? "Temporary password generated and emailed to staff user"
          : "Temporary password generated. Email delivery failed — credentials included in response as a fallback.",
        data: {
          emailSent: result.emailSent,
          // When email delivery succeeds, credentials are sent by email and are
          // intentionally NOT returned in the API response. They are only
          // included here as a recovery fallback if email delivery failed.
          ...(result.emailSent ? {} : { credentials: result.credentials }),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const staffController = new StaffController();
