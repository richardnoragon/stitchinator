use crate::App;
use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
type Error = (StatusCode, String);
fn error(s: impl ToString) -> Error {
    (StatusCode::BAD_REQUEST, s.to_string())
}
fn active(status: &str) -> bool {
    matches!(status, "Ready to make" | "In progress" | "On hold")
}
fn number(p: &Value, key: &str) -> Result<f64, String> {
    p[key]
        .as_str()
        .and_then(|s| s.parse().ok())
        .ok_or(format!("Missing measurement: {key}"))
}
fn requirements(p: &Value, inventory: &Value) -> Result<BTreeMap<String, f64>, String> {
    let mut result = BTreeMap::new();
    let pieces = p["pieces"]
        .as_array()
        .filter(|p| !p.is_empty())
        .ok_or("Open and save the project before reserving yarn")?;
    for piece in pieces {
        let plan = crate::yarn_plan::calculate_piece(piece, number(&p["fields"], "allowance")?)?;
        for lot in plan["lots"].as_array().unwrap() {
            let id = lot["id"].as_str().unwrap();
            if !inventory["items"]
                .as_array()
                .unwrap()
                .iter()
                .any(|y| y["id"] == id)
            {
                return Err("Assign existing inventory yarn lots to every piece or band".into());
            }
            *result.entry(id.into()).or_insert(0.0) += lot["grams"].as_f64().unwrap();
        }
    }
    Ok(result)
}
async fn collection(app: &App) -> Result<(BTreeMap<String, Value>, Value), Error> {
    let mut projects = BTreeMap::new();
    let mut entries = tokio::fs::read_dir(app.path.parent().unwrap().join("projects"))
        .await
        .map_err(error)?;
    let inventory = crate::inventory::read(app)
        .await
        .map_err(|(s, e)| (s, e.into()))?;
    while let Some(entry) = entries.next_entry().await.map_err(error)? {
        if entry.file_name() == crate::inventory::FILE
            || entry.path().extension().and_then(|s| s.to_str()) != Some("json")
        {
            continue;
        }
        let p: Value = serde_json::from_slice(&tokio::fs::read(entry.path()).await.map_err(error)?)
            .map_err(error)?;
        let id = p["id"]
            .as_str()
            .ok_or_else(|| error("Invalid project identity"))?
            .to_string();
        projects.insert(id, p);
    }
    Ok((projects, inventory))
}
fn token(projects: &BTreeMap<String, Value>, inventory: &Value) -> String {
    format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(&(projects, inventory)).unwrap())
    )
}
fn report(projects: &BTreeMap<String, Value>, inventory: &Value, id: &str) -> Result<Value, Error> {
    let p = projects.get(id).ok_or_else(|| error("Project missing"))?;
    let needed = requirements(p, inventory);
    let used = crate::consumption::totals(inventory, id);
    let desired = needed.clone().unwrap_or_default();
    let committed: BTreeMap<String, f64> =
        serde_json::from_value(p["reservation"]["grams"].clone()).unwrap_or_default();
    let status = p["lifecycle"].as_str().unwrap_or("Draft");
    let mut rows = Vec::new();
    for yarn in inventory["items"].as_array().unwrap() {
        let lot = yarn["id"].as_str().unwrap();
        let mut others = Vec::new();
        let mut other = 0.0;
        for (other_id, project) in projects {
            if other_id != id && active(project["lifecycle"].as_str().unwrap_or("Draft")) {
                let used_other = crate::consumption::totals(inventory, other_id);
                let grams = (project["reservation"]["grams"][lot].as_f64().unwrap_or(0.0)
                    - used_other.get(lot).unwrap_or(&0.0))
                .max(0.0);
                if grams > 0.0 {
                    other += grams;
                    others.push(json!({"name":project["fields"]["name"],"grams":grams}));
                }
            }
        }
        let owned = yarn["remaining_grams"].as_f64().unwrap();
        let consumed = *used.get(lot).unwrap_or(&0.0);
        let need = (*desired.get(lot).unwrap_or(&0.0) - consumed).max(0.0);
        let held = if active(status) {
            (*committed.get(lot).unwrap_or(&0.0) - consumed).max(0.0)
        } else {
            0.0
        };
        if need > 0.0 || held > 0.0 || consumed > 0.0 {
            rows.push(json!({"id":lot,"name":yarn["name"],"dye_lot":yarn["dye_lot"],"needed":need,"consumed":consumed,"committed":held,"owned":owned,"other_commitments":other,"available":(owned-other).max(0.0),"shortage":(need-(owned-other).max(0.0)).max(0.0),"others":others}));
        }
    }
    let mut dye_lots: BTreeMap<String, std::collections::BTreeSet<String>> = BTreeMap::new();
    for yarn in inventory["items"].as_array().unwrap() {
        if desired.contains_key(yarn["id"].as_str().unwrap()) {
            let key = format!("{}|{}|{}", yarn["brand"], yarn["product"], yarn["color"]);
            dye_lots
                .entry(key)
                .or_default()
                .insert(yarn["dye_lot"].as_str().unwrap_or("").into());
        }
    }
    let mixing = dye_lots.values().any(|lots| lots.len() > 1);
    Ok(
        json!({"token":token(projects,inventory),"status":status,"mixing_dye_lots":mixing,"needs_review":active(status)&&(needed.is_err() || desired!=committed),"error":needed.err(),"rows":rows}),
    )
}
pub async fn preview(State(app): State<App>, Path(id): Path<String>) -> Result<Json<Value>, Error> {
    let _guard = app.lock.lock().await;
    let (projects, inventory) = collection(&app).await?;
    report(&projects, &inventory, &id).map(Json)
}
pub async fn apply(
    State(app): State<App>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(input): Json<Value>,
) -> Result<Json<Value>, Error> {
    if headers.get("x-stitchinator").and_then(|h| h.to_str().ok()) != Some("1") {
        return Err((StatusCode::FORBIDDEN, "Missing application header".into()));
    }
    let _guard = app.lock.lock().await;
    let (mut projects, inventory) = collection(&app).await?;
    if input["token"].as_str() != Some(&token(&projects, &inventory)) {
        return Err((
            StatusCode::CONFLICT,
            "Collection changed. Preview reservations again before approving.".into(),
        ));
    }
    let status = input["status"]
        .as_str()
        .ok_or_else(|| error("Choose a project status"))?;
    if !matches!(
        status,
        "Draft" | "Ready to make" | "In progress" | "Completed" | "On hold" | "Abandoned"
    ) {
        return Err(error("Invalid status"));
    }
    let p = projects
        .get_mut(&id)
        .ok_or_else(|| error("Project missing"))?;
    let old = p["lifecycle"].as_str().unwrap_or("Draft");
    if matches!(status, "In progress" | "On hold") && !active(old) {
        return Err(error("Mark the project Ready to make first"));
    }
    let reconcile = input["reconcile"].as_bool().unwrap_or(false);
    if status == "Ready to make" || (active(status) && reconcile) {
        let grams = requirements(p, &inventory).map_err(error)?;
        p["reservation"] = json!({"grams":grams});
    } else if !active(status) {
        p["reservation"] = json!({"grams":{}});
    }
    p["lifecycle"] = json!(status);
    p["_version"] = json!(p["_version"].as_u64().unwrap_or(0) + 1);
    let path = app
        .path
        .parent()
        .unwrap()
        .join("projects")
        .join(format!("{id}.json"));
    let tmp = path.with_extension("tmp");
    tokio::fs::write(&tmp, serde_json::to_vec(p).unwrap())
        .await
        .map_err(error)?;
    tokio::fs::rename(tmp, path).await.map_err(error)?;
    report(&projects, &inventory, &id).map(Json)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn project() -> Value {
        json!({"id":"a","fields":{"name":"Bag","allowance":"10"},"pieces":[{"id":"body","quantity":2,"yarn":{"id":"lot"},"fields":{"width":"10","length":"40","swatch_width":"10","swatch_length":"10","stitches":"20","rows":"24","grams":"5","skein_grams":"50","skein_meters":"120"}}]})
    }
    fn inventory() -> Value {
        json!({"items":[{"id":"lot","name":"Cotton","remaining_grams":30,"dye_lot":"A","brand":"Brand","product":"Cotton","color":"Blue"}]})
    }
    #[test]
    fn consumption_reduces_active_commitments_without_reviving_released_ones() {
        let mut p = project();
        p["lifecycle"] = json!("In progress");
        p["reservation"] = json!({"grams":{"lot":44}});
        let mut inv = inventory();
        inv["items"][0]["remaining_grams"] = json!(20);
        inv["consumption"] = json!([{"project_id":"a","lot_id":"lot","grams":10}]);
        let mut projects = BTreeMap::from([("a".into(), p)]);
        let r = report(&projects, &inv, "a").unwrap();
        assert_eq!(r["rows"][0]["committed"], 34.0);
        assert!((r["rows"][0]["needed"].as_f64().unwrap() - 34.0).abs() < 0.00001);
        projects.get_mut("a").unwrap()["lifecycle"] = json!("Completed");
        inv["consumption"][0]["grams"] = json!(0);
        assert_eq!(
            report(&projects, &inv, "a").unwrap()["rows"][0]["committed"],
            0.0
        );
    }
    #[test]
    fn quantities_shortages_and_competing_commitments() {
        let mut projects = BTreeMap::from([("a".into(), project())]);
        let mut other = project();
        other["lifecycle"] = json!("On hold");
        other["reservation"] = json!({"grams":{"lot":20}});
        projects.insert("b".into(), other);
        let r = report(&projects, &inventory(), "a").unwrap();
        assert!((r["rows"][0]["needed"].as_f64().unwrap() - 44.0).abs() < 0.000001);
        assert_eq!(r["rows"][0]["available"], 10.0);
        assert!((r["rows"][0]["shortage"].as_f64().unwrap() - 34.0).abs() < 0.000001);
        assert_eq!(r["rows"][0]["others"].as_array().unwrap().len(), 1);
        projects.get_mut("b").unwrap()["lifecycle"] = json!("Completed");
        assert_eq!(
            report(&projects, &inventory(), "a").unwrap()["rows"][0]["other_commitments"],
            0.0
        );
    }
    #[test]
    fn changed_design_and_missing_measurements_require_review() {
        let mut p = project();
        p["lifecycle"] = json!("Ready to make");
        p["reservation"] = json!({"grams":{"lot":10}});
        let mut projects = BTreeMap::from([("a".into(), p)]);
        assert_eq!(
            report(&projects, &inventory(), "a").unwrap()["needs_review"],
            true
        );
        let before = token(&projects, &inventory());
        projects.get_mut("a").unwrap()["pieces"][0]["fields"]["grams"] = json!("");
        assert_ne!(before, token(&projects, &inventory()));
        assert!(report(&projects, &inventory(), "a").unwrap()["error"].is_string());
    }
}
