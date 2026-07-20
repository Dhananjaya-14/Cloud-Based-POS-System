import pool from "../config/database.js";

const getCompanyFeatures = async (com_id) => {
  if (!com_id) return null;
  const result = await pool.query(`
    SELECT p.features
    FROM "Company" c
    JOIN "Package" p ON c.package_id = p.package_id
    WHERE c.com_id = $1
  `, [com_id]);
  if (result.rows.length === 0) return null;
  return result.rows[0].features;
};

export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
  
      if (Number(req.user?.role_id) === 6) return next();

      const com_id = req.user?.com_id;
      if (!com_id) {
        return res.status(403).json({ error: "No company associated with this user." });
      }

      const features = await getCompanyFeatures(com_id);
      if (!features) {
        return next();
      }

      if (features[featureName] === true) return next();

      return res.status(403).json({
        error: "Access Denied. Your current package does not include this feature. Please upgrade your plan.",
        feature: featureName,
      });
    } catch (err) {
      console.error("requireFeature error:", err);
      res.status(500).json({ error: "Server error while checking package features." });
    }
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// checkQuota("max_users", "User")
// Before creating a record, counts existing ones and blocks if limit is reached.
// Super Admin (role_id 6) resolves the target company from req.body.
// ─────────────────────────────────────────────────────────────────────────────
export const checkQuota = (quotaName, tableName, companyColumn = "com_id") => {
  return async (req, res, next) => {
    try {
      let target_com_id = req.user?.com_id;

      // Super Admin: resolve target company from the request body
      if (Number(req.user?.role_id) === 6) {
        const bodyComId = req.body?.com_id ?? req.body?.company_id;
        const bodyBId   = req.body?.B_id ?? req.body?.b_id ?? req.body?.branch_id;

        if (bodyComId) {
          target_com_id = Number(bodyComId);
        } else if (bodyBId) {
          const br = await pool.query('SELECT com_id FROM "Branch" WHERE "B_id" = $1', [bodyBId]);
          target_com_id = br.rows[0]?.com_id ?? null;
        } else {
          // e.g. creating another Super Admin — no company context, bypass quota
          return next();
        }
      }

      if (!target_com_id) return next(); // No company context — don't block

      const features = await getCompanyFeatures(target_com_id);
      if (!features) return next(); // No package assigned — don't block

      const limit = features[quotaName];
      if (limit === undefined || limit === null) return next(); // No limit defined

      const countRes = await pool.query(
        `SELECT COUNT(*) FROM "${tableName}" WHERE "${companyColumn}" = $1`,
        [target_com_id]
      );
      const currentCount = parseInt(countRes.rows[0].count, 10);

      if (currentCount >= limit) {
        return res.status(403).json({
          error: `Limit Reached: Your current plan allows a maximum of ${limit} ${tableName}(s). Please upgrade your package to add more.`,
          quota: quotaName,
          limit,
          current: currentCount,
        });
      }

      next();
    } catch (err) {
      console.error("checkQuota error:", err);
      res.status(500).json({ error: "Server error while checking package quota." });
    }
  };
};
