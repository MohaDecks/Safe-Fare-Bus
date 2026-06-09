const Menu = require("../models/Menu");
const { PERMISSION_MENUS } = require("./permissionConstants");

async function ensureMenus() {
  let order = 0;
  for (const m of PERMISSION_MENUS) {
    order += 1;
    await Menu.findOneAndUpdate(
      { slug: m.slug },
      {
        slug: m.slug,
        label: m.menu,
        parent: m.parent,
        sort_order: order,
        allow_view: !!m.view,
        allow_add: !!m.add,
        allow_update: !!m.update,
        allow_delete: !!m.delete,
      },
      { upsert: true, new: true }
    );
  }
}

module.exports = { ensureMenus };
