const mongoose = require("mongoose");

/** One document per role + menu — like water-billing `rolepermissions` */
const rolePermissionSchema = new mongoose.Schema(
  {
    company_id: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    admin_role_id: { type: mongoose.Schema.Types.ObjectId, ref: "AdminRole", required: true },
    menu_id: { type: mongoose.Schema.Types.ObjectId, ref: "Menu", required: true },
    canView: { type: Boolean, default: false },
    canAdd: { type: Boolean, default: false },
    canUpdate: { type: Boolean, default: false },
    canDelete: { type: Boolean, default: false },
  },
  { timestamps: true }
);

rolePermissionSchema.index({ company_id: 1, admin_role_id: 1, menu_id: 1 }, { unique: true });

rolePermissionSchema.methods.toPublic = function (menu) {
  return {
    id: this._id.toString(),
    role_id: this.admin_role_id.toString(),
    menu_id: this.menu_id.toString(),
    menu: menu?.label || "",
    parent: menu?.parent || "—",
    slug: menu?.slug || "",
    canView: this.canView,
    canAdd: this.canAdd,
    canUpdate: this.canUpdate,
    canDelete: this.canDelete,
  };
};

module.exports = mongoose.model("RolePermission", rolePermissionSchema);
