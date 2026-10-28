use crate::App;
use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use serde_json::{Value, json};
use std::{collections::BTreeMap, fs, path::Path as FsPath};
type Error = (StatusCode, String);
fn err(s: impl ToString) -> Error {
    (StatusCode::BAD_REQUEST, s.to_string())
}
pub fn totals(inventory: &Value, project: &str) -> BTreeMap<String, f64> {
    let mut result = BTreeMap::new();
    if let Some(entries) = inventory["consumption"].as_array() {
        for e in entries {
            if let (true, Some(lot), Some(g)) = (
                e["project_id"] == project,
                e["lot_id"].as_str(),
                e["grams"].as_f64(),
            ) {
                *result.entry(lot.into()).or_insert(0.0) += g;
            }
        }
    }
    result
}
fn valid_id(v: &Value) -> bool {
    v.as_str().is_some_and(|s| {
        !s.is_empty() && s.len() <= 64 && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    })
}
pub fn validate(inventory: &Value) -> Result<(), &'static str> {
    let Some(value) = inventory.get("consumption") else {
        return Ok(());
    };
    let entries = value.as_array().ok_or("Invalid consumption ledger")?;
    if entries.len() > 10000 {
        return Err("Consumption ledger limit reached");
    }
    let mut ids = std::collections::BTreeSet::new();
    for e in entries {
        if !valid_id(&e["id"])
            || !valid_id(&e["project_id"])
            || !valid_id(&e["lot_id"])
            || !ids.insert(e["id"].as_str().unwrap())
            || !e["grams"]
                .as_f64()
                .is_some_and(|n| n.is_finite() && (0.0..=1000000.0).contains(&n))
            || !e["note"].as_str().is_some_and(|s| s.len() <= 2000)
            || !e["history"]
                .as_array()
                .is_some_and(|a| !a.is_empty() && a.len() <= 1000)
        {
            return Err("Invalid consumption entry");
        }
        let mut previous = 0.0;
        for h in e["history"].as_array().unwrap() {
            if h["before"].as_f64() != Some(previous)
                || !h["after"]
                    .as_f64()
                    .is_some_and(|n| n.is_finite() && (0.0..=1000000.0).contains(&n))
                || !h["note"].as_str().is_some_and(|s| s.len() <= 2000)
                || !h["at"]
                    .as_str()
                    .is_some_and(|s| chrono::DateTime::parse_from_rfc3339(s).is_ok())
            {
                return Err("Invalid consumption history");
            }
            previous = h["after"].as_f64().unwrap();
        }
        if e["grams"].as_f64() != Some(previous) {
            return Err("Consumption history does not match current total");
        }
    }
    Ok(())
}
fn project_path(app: &App, id: &str) -> Result<std::path::PathBuf, Error> {
    if !valid_id(&json!(id)) {
        return Err(err("Invalid project ID"));
    }
    Ok(app
        .path
        .parent()
        .unwrap()
        .join("projects")
        .join(format!("{id}.json")))
}
async fn project(app: &App, id: &str) -> Result<Value, Error> {
    serde_json::from_slice(&tokio::fs::read(project_path(app, id)?).await.map_err(err)?)
        .map_err(err)
}
fn view(p: &Value, inventory: &Value) -> Value {
    let entries: Vec<_> = inventory["consumption"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|e| e["project_id"] == p["id"])
        .cloned()
        .collect();
    json!({"inventory_version":inventory["_version"],"project_version":p["_version"],"entries":entries,"lots":inventory["items"],"totals":totals(inventory,p["id"].as_str().unwrap()),"status":p.get("lifecycle").unwrap_or(&json!("Draft"))})
}
pub async fn get(State(app): State<App>, Path(id): Path<String>) -> Result<Json<Value>, Error> {
    let _guard = app.lock.lock().await;
    let p = project(&app, &id).await?;
    let inventory = crate::inventory::read(&app)
        .await
        .map_err(|(s, e)| (s, e.into()))?;
    Ok(Json(view(&p, &inventory)))
}
pub fn change(inventory: &Value, p: &Value, input: &Value) -> Result<Value, Error> {
    let mut next = inventory.clone();
    let grams = input["grams"]
        .as_f64()
        .filter(|g| g.is_finite() && (0.0..=1000000.0).contains(g))
        .ok_or_else(|| err("Enter grams from 0 to 1000000"))?;
    let note = input["note"]
        .as_str()
        .filter(|s| s.len() <= 2000)
        .ok_or_else(|| err("Keep notes within 2000 characters"))?;
    let id = input["entry_id"].as_str().unwrap_or("");
    if next.get("consumption").is_none() {
        next["consumption"] = json!([])
    }
    let old = if id.is_empty() {
        None
    } else {
        Some(
            next["consumption"]
                .as_array()
                .unwrap()
                .iter()
                .find(|e| e["id"] == id && e["project_id"] == p["id"])
                .cloned()
                .ok_or_else(|| err("Consumption entry not found"))?,
        )
    };
    if old.is_none() && grams == 0.0 {
        return Err(err("New consumption must be greater than zero"));
    }
    if old.is_some() && note.trim().is_empty() {
        return Err(err("Explain the correction or removal in the notes"));
    }
    let lot = old
        .as_ref()
        .and_then(|e| e["lot_id"].as_str())
        .or_else(|| input["lot_id"].as_str())
        .ok_or_else(|| err("Choose a yarn lot"))?;
    let old_grams = old
        .as_ref()
        .and_then(|e| e["grams"].as_f64())
        .unwrap_or(0.0);
    let yarn = next["items"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|y| y["id"] == lot)
        .ok_or_else(|| err("Yarn lot is missing; recover it before correcting usage"))?;
    let owned = yarn["remaining_grams"].as_f64().unwrap();
    let remaining = owned + old_grams - grams;
    if !(0.0..=1000000.0).contains(&remaining) {
        return Err(err(
            "Usage exceeds recorded owned stock, or correction exceeds the stock limit. Check the inventory before proceeding.",
        ));
    }
    yarn["remaining_grams"] = json!(remaining);
    let now = chrono::Utc::now().to_rfc3339();
    let mut entry=old.clone().unwrap_or_else(||json!({"id":format!("use-{}",std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()),"project_id":p["id"],"project_name":p["fields"]["name"],"lot_id":lot,"lot_name":yarn["name"],"history":[]}));
    entry["grams"] = json!(grams);
    entry["note"] = json!(note);
    entry["history"].as_array_mut().unwrap().push(json!({"at":now,"before":old_grams,"after":grams,"note":note,"status":p.get("lifecycle").unwrap_or(&json!("Draft"))}));
    let entries = next["consumption"].as_array_mut().unwrap();
    if old.is_some() {
        let index = entries.iter().position(|e| e["id"] == id).unwrap();
        entries[index] = entry;
    } else {
        entries.push(entry)
    }
    validate(&next).map_err(err)?;
    next["_version"] = json!(inventory["_version"].as_u64().unwrap_or(0) + 1);
    if serde_json::to_vec(&next).unwrap().len() > 2 * 1024 * 1024 {
        return Err(err("Inventory and history exceed the 2 MB limit"));
    }
    Ok(next)
}
fn persist(path: &FsPath, value: &Value) -> Result<(), Error> {
    use std::io::Write;
    let tmp = path.with_extension("tmp");
    let mut file = fs::File::create(&tmp).map_err(err)?;
    file.write_all(&serde_json::to_vec(value).unwrap())
        .map_err(err)?;
    file.sync_all().map_err(err)?;
    fs::rename(tmp, path).map_err(err)?;
    fs::File::open(path.parent().unwrap())
        .and_then(|d| d.sync_all())
        .map_err(err)
}
pub async fn put(
    State(app): State<App>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(input): Json<Value>,
) -> Result<Json<Value>, Error> {
    if headers.get("x-stitchinator").and_then(|h| h.to_str().ok()) != Some("1") {
        return Err((StatusCode::FORBIDDEN, "Missing application header".into()));
    }
    let _guard = app.lock.lock().await;
    let p = project(&app, &id).await?;
    let inventory = crate::inventory::read(&app)
        .await
        .map_err(|(s, e)| (s, e.into()))?;
    if input["inventory_version"] != inventory["_version"]
        || input["project_version"] != p["_version"]
    {
        return Err((
            StatusCode::CONFLICT,
            "Stock or project changed. Refresh consumption before applying; do not retry blindly."
                .into(),
        ));
    }
    let next = change(&inventory, &p, &input)?;
    persist(
        &app.path
            .parent()
            .unwrap()
            .join("projects")
            .join(crate::inventory::FILE),
        &next,
    )?;
    Ok(Json(view(&p, &next)))
}

#[cfg(test)]
mod tests {
    use super::*;
    fn stock() -> Value {
        json!({"_version":1,"items":[{"id":"lot","name":"Cotton","remaining_grams":50}]})
    }
    fn p() -> Value {
        json!({"id":"project","fields":{"name":"Bag"},"lifecycle":"In progress"})
    }
    #[test]
    fn usage_corrections_void_and_failed_changes_preserve_accounting() {
        let original = stock();
        let first = change(
            &original,
            &p(),
            &json!({"lot_id":"lot","grams":20,"note":"First rows"}),
        )
        .unwrap();
        assert_eq!(original["items"][0]["remaining_grams"], 50);
        assert_eq!(first["items"][0]["remaining_grams"], 30.0);
        let id = first["consumption"][0]["id"].clone();
        let corrected = change(
            &first,
            &p(),
            &json!({"entry_id":id,"grams":10,"note":"Weighed again"}),
        )
        .unwrap();
        assert_eq!(corrected["items"][0]["remaining_grams"], 40.0);
        assert_eq!(totals(&corrected, "project")["lot"], 10.0);
        assert_eq!(
            corrected["consumption"][0]["history"]
                .as_array()
                .unwrap()
                .len(),
            2
        );
        assert!(
            change(
                &corrected,
                &p(),
                &json!({"entry_id":id,"grams":100,"note":"Too much"})
            )
            .is_err()
        );
        assert!(
            change(
                &corrected,
                &p(),
                &json!({"entry_id":id,"grams":0,"note":""})
            )
            .is_err()
        );
        let removed = change(
            &corrected,
            &p(),
            &json!({"entry_id":id,"grams":0,"note":"Wrong project"}),
        )
        .unwrap();
        assert_eq!(removed["items"][0]["remaining_grams"], 50.0);
        assert_eq!(
            removed["consumption"][0]["history"]
                .as_array()
                .unwrap()
                .len(),
            3
        );
        assert_eq!(totals(&removed, "project")["lot"], 0.0);
    }
    #[test]
    fn persisted_stock_and_ledger_are_one_snapshot() {
        let dir = std::env::temp_dir().join(format!("stitchinator-usage-{}", std::process::id()));
        fs::create_dir_all(&dir).unwrap();
        let next = change(
            &stock(),
            &p(),
            &json!({"lot_id":"lot","grams":7,"note":"Sample"}),
        )
        .unwrap();
        let path = dir.join("inventory.json");
        persist(&path, &next).unwrap();
        let saved: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        assert_eq!(saved["items"][0]["remaining_grams"], 43.0);
        assert_eq!(totals(&saved, "project")["lot"], 7.0);
        // An abandoned staging file cannot change the committed inventory.
        fs::write(path.with_extension("tmp"), b"interrupted write").unwrap();
        assert_eq!(
            serde_json::from_slice::<Value>(&fs::read(path).unwrap()).unwrap(),
            saved
        );
        fs::remove_dir_all(dir).unwrap();
    }
}
