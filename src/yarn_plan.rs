use crate::{Estimate, calculate};
use axum::{Json, http::StatusCode};
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet};
fn number(f: &Value, key: &str) -> Result<f64, String> {
    f[key]
        .as_str()
        .and_then(|s| s.parse().ok())
        .ok_or(format!("Missing measurement: {key}"))
}
pub fn cumulative_area(shape: &str, y: f64) -> Result<f64, String> {
    let y = y.clamp(0.0, 1.0);
    match shape {
        "rectangle" => Ok(y),
        "triangle" => Ok(y * y / 2.0),
        "circle" | "oval" => {
            let t = 2.0 * y - 1.0;
            Ok((t.asin() + t * (1.0 - t * t).max(0.0).sqrt() + std::f64::consts::PI / 2.0) / 4.0)
        }
        _ => Err("Unsupported piece shape".into()),
    }
}
pub fn calculate_piece(piece: &Value, allowance: f64) -> Result<Value, String> {
    if piece.get("amigurumi").is_some() {
        return Err(
            "Amigurumi yarn estimates are not calibrated; flat-piece area estimates are not used"
                .into(),
        );
    }
    let quantity = piece["quantity"]
        .as_u64()
        .filter(|q| *q > 0 && *q <= 99)
        .ok_or("Invalid quantity")? as f64;
    let fields = &piece["fields"];
    let shape = match piece.get("shape") {
        None => "rectangle",
        Some(Value::String(s)) => s.as_str(),
        _ => return Err("Invalid shape".into()),
    };
    cumulative_area(shape, 1.0)?;
    let width = number(fields, "width")?;
    let length = if shape == "circle" {
        width
    } else {
        number(fields, "length")?
    };
    let sections = piece["sections"].as_array();
    if piece.get("sections").is_some() && sections.is_none() {
        return Err("Invalid yarn sections".into());
    }
    if let Some(sections) = sections {
        if sections.is_empty() || sections.len() > 32 {
            return Err("Use 1–32 yarn bands".into());
        }
        let total: f64 = sections
            .iter()
            .map(|s| s["percent"].as_f64().unwrap_or(0.0))
            .sum();
        if (total - 100.0).abs() > 0.000001 {
            return Err("Band length percentages must total 100%".into());
        }
    }
    let legacy = json!([{"id":"legacy","name":"Whole piece","percent":100,"fields":fields,"allocations":[{"yarn":piece.get("yarn").cloned().unwrap_or(json!({"id":"unassigned","name":"Unassigned yarn","dye_lot":"","skein_grams":number(fields,"skein_grams").unwrap_or(0.0),"skein_meters":number(fields,"skein_meters").unwrap_or(0.0)})),"percent":100}]}]);
    let bands = sections.unwrap_or_else(|| legacy.as_array().unwrap());
    let mut ids = BTreeSet::new();
    let mut rows = Vec::new();
    let mut lots: BTreeMap<String, Value> = BTreeMap::new();
    let mut mass = 0.0;
    let mut meters = 0.0;
    let mut start = 0.0;
    for band in bands {
        let id = band["id"]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 64)
            .ok_or("Invalid band identity")?;
        if !ids.insert(id) {
            return Err("Duplicate band identity".into());
        }
        let name = band["name"]
            .as_str()
            .filter(|s| !s.trim().is_empty() && s.len() <= 100)
            .ok_or("Name each band")?;
        let percent = band["percent"]
            .as_f64()
            .filter(|v| v.is_finite() && *v > 0.0 && *v <= 100.0)
            .ok_or("Invalid band percentage")?;
        let allocations = band["allocations"]
            .as_array()
            .filter(|a| !a.is_empty() && a.len() <= 8)
            .ok_or("Allocate 1–8 yarn lots per band")?;
        let sum: f64 = allocations
            .iter()
            .map(|a| a["percent"].as_f64().unwrap_or(0.0))
            .sum();
        if (sum - 100.0).abs() > 0.000001 {
            return Err("Lot allocation percentages must total 100% for each band".into());
        }
        let f = &band["fields"];
        let first = &allocations[0]["yarn"];
        let skein_grams = if sections.is_some() {
            first["skein_grams"].as_f64().ok_or("Missing yarn weight")?
        } else {
            number(fields, "skein_grams")?
        };
        let skein_meters = if sections.is_some() {
            first["skein_meters"]
                .as_f64()
                .ok_or("Missing yarn length")?
        } else {
            number(fields, "skein_meters")?
        };
        let mut estimate = calculate(&Estimate {
            width,
            length: length * percent / 100.0,
            swatch_width: number(f, "swatch_width")?,
            swatch_length: number(f, "swatch_length")?,
            stitches: number(f, "stitches")?,
            rows: number(f, "rows")?,
            grams: number(f, "grams")?,
            skein_grams,
            skein_meters,
            allowance,
        })?;
        let end = start + percent / 100.0;
        let factor =
            (cumulative_area(shape, end)? - cumulative_area(shape, start)?) / (percent / 100.0);
        estimate.grams *= factor;
        estimate.meters *= factor;
        estimate.skeins *= factor;
        start = end;
        let grams = estimate.grams * quantity;
        mass += grams;
        meters += estimate.meters * quantity;
        rows.push(json!({"name":name,"percent":percent,"grams":grams,"stitches":if shape=="rectangle"{Some(estimate.stitches)}else{None},"rows":if shape=="rectangle"{Some(estimate.rows)}else{None},"hook":f["hook"],"blocking":f["blocking"],"pattern":band["pattern"]}));
        let mut lot_ids = BTreeSet::new();
        for allocation in allocations {
            let yarn = &allocation["yarn"];
            let lot = yarn["id"]
                .as_str()
                .filter(|s| {
                    !s.is_empty()
                        && s.len() <= 64
                        && s.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
                })
                .ok_or("Invalid yarn lot")?;
            if !lot_ids.insert(lot) {
                return Err("Use each lot only once per band".into());
            }
            if sections.is_some()
                && [
                    "brand",
                    "product",
                    "fiber",
                    "color",
                    "category",
                    "shape",
                    "size_mm",
                    "thickness_mm",
                    "skein_grams",
                    "skein_meters",
                ]
                .iter()
                .any(|key| yarn[*key] != first[*key])
            {
                return Err("Split lots must have matching yarn/color specifications; use another band for a different yarn".into());
            }
            let share = allocation["percent"]
                .as_f64()
                .filter(|v| v.is_finite() && *v > 0.0 && *v <= 100.0)
                .ok_or("Invalid lot percentage")?
                / 100.0;
            let row=lots.entry(lot.into()).or_insert_with(||json!({"id":lot,"name":yarn["name"],"dye_lot":yarn["dye_lot"],"grams":0.0,"meters":0.0,"skeins":0.0}));
            row["grams"] = json!(row["grams"].as_f64().unwrap() + grams * share);
            row["meters"] =
                json!(row["meters"].as_f64().unwrap() + estimate.meters * quantity * share);
            row["skeins"] =
                json!(row["skeins"].as_f64().unwrap() + estimate.skeins * quantity * share);
        }
    }
    Ok(
        json!({"shape":shape,"area_cm2":width*length*cumulative_area(shape,1.0)?,"grams":mass,"meters":meters,"lots":lots.into_values().collect::<Vec<_>>(),"bands":rows}),
    )
}
pub async fn estimate(Json(input): Json<Value>) -> Result<Json<Value>, (StatusCode, String)> {
    let allowance = input["allowance"]
        .as_f64()
        .ok_or((StatusCode::BAD_REQUEST, "Missing allowance".into()))?;
    calculate_piece(&input["piece"], allowance)
        .map(Json)
        .map_err(|e| (StatusCode::UNPROCESSABLE_ENTITY, e))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn yarn(id: &str) -> Value {
        json!({"id":id,"name":id,"dye_lot":id,"brand":"B","product":"Cotton","fiber":"Cotton","color":"Blue","category":"DK","shape":"round","size_mm":2,"thickness_mm":null,"skein_grams":50,"skein_meters":120})
    }
    fn piece() -> Value {
        let f = json!({"swatch_width":"10","swatch_length":"10","stitches":"20","rows":"24","grams":"5","hook":"4"});
        json!({"quantity":2,"fields":{"width":"20","length":"100"},"sections":[{"id":"band-a","name":"A","percent":50,"fields":f,"allocations":[{"yarn":yarn("lot-a"),"percent":60},{"yarn":yarn("lot-b"),"percent":40}]},{"id":"band-b","name":"B","percent":50,"fields":f,"allocations":[{"yarn":yarn("lot-c"),"percent":100}]}]})
    }
    #[test]
    fn band_area_and_split_lots_apply_quantity_and_allowance_once() {
        let p = piece();
        let r = calculate_piece(&p, 10.0).unwrap();
        assert!((r["grams"].as_f64().unwrap() - 220.0).abs() < 0.00001);
        let lots = r["lots"].as_array().unwrap();
        assert!((lots[0]["grams"].as_f64().unwrap() - 66.0).abs() < 0.00001);
        assert!((lots[1]["grams"].as_f64().unwrap() - 44.0).abs() < 0.00001);
        assert!((r["bands"][0]["rows"].as_f64().unwrap() - 120.0).abs() < 0.00001);
    }
    #[test]
    fn rejects_incomplete_incompatible_and_missing_measurements() {
        let mut p = piece();
        p["sections"][0]["percent"] = json!(30);
        assert!(calculate_piece(&p, 10.0).is_err());
        let mut p = piece();
        p["sections"][0]["allocations"][0]["percent"] = json!(50);
        assert!(calculate_piece(&p, 10.0).is_err());
        let mut p = piece();
        p["sections"][0]["allocations"][1]["yarn"]["skein_meters"] = json!(999);
        assert!(calculate_piece(&p, 10.0).is_err());
        let mut p = piece();
        p["sections"][1]["fields"]["grams"] = json!("");
        assert!(calculate_piece(&p, 10.0).is_err());
    }
    #[test]
    fn shaped_area_uses_geometry_and_band_intersections() {
        let mut p = piece();
        p["shape"] = json!("triangle");
        let r = calculate_piece(&p, 10.0).unwrap();
        assert!((r["grams"].as_f64().unwrap() - 110.0).abs() < 0.00001);
        assert!((r["bands"][0]["grams"].as_f64().unwrap() - 27.5).abs() < 0.00001);
        assert!((r["bands"][1]["grams"].as_f64().unwrap() - 82.5).abs() < 0.00001);
        p["shape"] = json!("oval");
        assert!(
            (calculate_piece(&p, 10.0).unwrap()["grams"]
                .as_f64()
                .unwrap()
                - 220.0 * std::f64::consts::PI / 4.0)
                .abs()
                < 0.00001
        );
        p["shape"] = json!("circle");
        p["fields"]["length"] = json!("");
        let circle = calculate_piece(&p, 10.0).unwrap();
        assert!(
            (circle["area_cm2"].as_f64().unwrap() - 100.0 * std::f64::consts::PI).abs() < 0.00001
        );
        assert!(
            (circle["grams"].as_f64().unwrap() - 22.0 * std::f64::consts::PI / 2.0).abs() < 0.00001
        );
        p["shape"] = json!("sphere");
        assert!(calculate_piece(&p, 10.0).is_err());
    }
}
