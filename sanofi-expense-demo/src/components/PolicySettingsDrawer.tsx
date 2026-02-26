import { useEffect, useState } from "react";
import { getMealLimitPerPersonCad, setMealLimitPerPersonCad } from "../policy/policyConfig";
import "./SettingsDrawer.css";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PolicySettingsDrawer({ open, onClose }: Props) {
  const [mealLimit, setMealLimit] = useState(String(getMealLimitPerPersonCad()));

  useEffect(() => {
    if (open) {
      setMealLimit(String(getMealLimitPerPersonCad()));
    }
  }, [open]);

  const handleSave = () => {
    const n = Number(mealLimit);
    if (Number.isFinite(n) && n > 0) {
      setMealLimitPerPersonCad(n);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <>
      <div className="settings-drawer-overlay" onClick={onClose} aria-hidden />
      <div className="settings-drawer" role="dialog" aria-labelledby="policy-settings-drawer-title">
        <div className="settings-drawer-header">
          <h2 id="policy-settings-drawer-title">Policy Settings</h2>
          <button type="button" onClick={onClose} className="settings-drawer-close" aria-label="Close">
            ×
          </button>
        </div>
        <div className="settings-drawer-body">
          <div className="settings-field">
            <label>Meal limit per person (CAD)</label>
            <input
              type="number"
              min={1}
              step={1}
              value={mealLimit}
              onChange={(e) => setMealLimit(e.target.value)}
              className="settings-input"
            />
          </div>
        </div>
        <div className="settings-drawer-footer">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn btn-primary">
            Save
          </button>
        </div>
      </div>
    </>
  );
}
