use crate::App;
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use serde_json::{Value, json};
use std::collections::HashSet;
type Error = (StatusCode, &'static str);
pub const FILE: &str = "_patterns.json";
pub fn starters() -> Vec<Value> {
    serde_json::from_str(include_str!("../web/starter-patterns.json"))
        .expect("Bundled patterns are valid JSON")
}
fn text(v: &Value, max: usize, required: bool) -> bool {
    v.as_str()
        .is_some_and(|s| s.chars().count() <= max && (!required || !s.trim().is_empty()))
}
fn id(v: &Value) -> bool {
    v.as_str().is_some_and(|s| {
        !s.is_empty() && s.len() <= 64 && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-')
    })
}
fn image(v: &Value, prefix: &str, max: usize) -> bool {
    v.as_str().is_some_and(|s| {
        s.len() <= max
            && s.strip_prefix(prefix).is_some_and(|data| {
                !data.is_empty()
                    && data
                        .bytes()
                        .all(|b| b.is_ascii_alphanumeric() || b"+/=".contains(&b))
            })
    })
}
pub fn validate_entry(p: &Value) -> Result<(), &'static str> {
    if !id(&p["id"])
        || !text(&p["name"], 100, true)
        || !text(&p["description"], 2000, false)
        || !text(&p["instructions"], 16000, false)
    {
        return Err(
            "Enter a pattern name (100 characters), description (2000), and instructions (16000) within limits",
        );
    }
    let cols = p["cols"]
        .as_u64()
        .filter(|n| (1..=40).contains(n))
        .ok_or("Use 1–40 chart columns")?;
    let rows = p["rows"]
        .as_u64()
        .filter(|n| (1..=40).contains(n))
        .ok_or("Use 1–40 chart rows")?;
    let stitches = p["stitches"]
        .as_array()
        .filter(|a| !a.is_empty() && a.len() <= 200)
        .ok_or("Use 1–200 stitch definitions")?;
    let mut ids = HashSet::new();
    for s in stitches {
        if !id(&s["id"])
            || !ids.insert(s["id"].as_str().unwrap())
            || !text(&s["name"], 200, true)
            || !text(&s["abbr"], 40, true)
            || !text(&s["symbol"], 8, false)
            || !["consumed", "produced"]
                .iter()
                .all(|k| s[k].as_u64().is_some_and(|n| n <= 1000))
            || (s.get("image").is_some() && !image(&s["image"], "data:image/png;base64,", 60000))
        {
            return Err("Invalid pattern stitch definitions");
        }
    }
    let cells = p["cells"]
        .as_array()
        .filter(|a| a.len() == (cols * rows) as usize)
        .ok_or("Chart dimensions do not match its cells")?;
    if cells
        .iter()
        .any(|c| !c.as_str().is_some_and(|s| ids.contains(s)))
    {
        return Err("Pattern refers to a missing stitch");
    }
    if p.get("photo").is_some() && !image(&p["photo"], "data:image/jpeg;base64,", 200000) {
        return Err("Invalid pattern photo (use a compact JPEG)");
    }
    if let Some(placements) = p.get("cellPlacements") {
        let map = placements.as_object().ok_or("Invalid chart placements")?;
        for (key, pose) in map {
            if key
                .parse::<usize>()
                .ok()
                .filter(|i| *i < cells.len() && i.to_string() == *key)
                .is_none()
                || !["top", "center", "bottom"].contains(&pose["anchor"].as_str().unwrap_or(""))
                || ![
                    "center",
                    "top",
                    "bottom",
                    "top-left",
                    "top-right",
                    "bottom-left",
                    "bottom-right",
                    "free",
                ]
                .contains(&pose["snap"].as_str().unwrap_or(""))
                || !pose["rotation"]
                    .as_f64()
                    .is_some_and(|n| n.is_finite() && n.abs() <= 180.)
                || (pose["snap"] == "free"
                    && !['x', 'y'].iter().all(|axis| {
                        pose[format!("d{axis}")]
                            .as_f64()
                            .is_some_and(|n| n.is_finite() && n.abs() <= 4000.)
                    }))
            {
                return Err("Invalid chart placement");
            }
        }
    }
    Ok(())
}
pub fn validate(v: &Value) -> Result<(), &'static str> {
    if v["schema"] != 1 || v["id"] != "_patterns" {
        return Err("Invalid pattern library format");
    }
    let entries = v["entries"]
        .as_array()
        .filter(|a| a.len() <= 100)
        .ok_or("The library supports 100 saved patterns")?;
    let mut names: HashSet<String> = starters()
        .iter()
        .map(|p| p["name"].as_str().unwrap().to_lowercase())
        .collect();
    let mut ids = HashSet::new();
    for p in entries {
        validate_entry(p)?;
        if p["id"].as_str().unwrap().starts_with("starter-")
            || !ids.insert(p["id"].as_str().unwrap())
            || !names.insert(p["name"].as_str().unwrap().trim().to_lowercase())
        {
            return Err("Save with a unique new name and ID; originals cannot be overwritten");
        }
    }
    if serde_json::to_vec(v)
        .map_err(|_| "Invalid library JSON")?
        .len()
        > 16 * 1024 * 1024
    {
        return Err("Shared pattern library exceeds 16 MB");
    }
    Ok(())
}
async fn read(app: &App) -> Result<Value, Error> {
    match tokio::fs::read(app.path.parent().unwrap().join("projects").join(FILE)).await {
        Ok(bytes) => {
            let v = serde_json::from_slice(&bytes).map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Unreadable pattern library",
                )
            })?;
            validate(&v).map_err(|_| {
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Invalid saved pattern library",
                )
            })?;
            Ok(v)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            Ok(json!({"schema":1,"id":"_patterns","_version":0,"entries":[]}))
        }
        Err(_) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Unable to read pattern library",
        )),
    }
}
fn response(mut value: Value) -> Json<Value> {
    value["starters"] = json!(starters());
    Json(value)
}
pub async fn get(State(app): State<App>) -> Result<Json<Value>, Error> {
    let _guard = app.lock.lock().await;
    read(&app).await.map(response)
}
pub async fn append(
    State(app): State<App>,
    headers: HeaderMap,
    Json(entry): Json<Value>,
) -> Result<Json<Value>, Error> {
    if headers.get("x-stitchinator").and_then(|v| v.to_str().ok()) != Some("1") {
        return Err((StatusCode::FORBIDDEN, "Missing application header"));
    }
    validate_entry(&entry).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    let _guard = app.lock.lock().await;
    let mut value = read(&app).await?;
    let version = value["_version"].as_u64().unwrap_or(0);
    if headers
        .get("x-pattern-version")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok())
        != Some(version)
    {
        return Err((
            StatusCode::CONFLICT,
            "Library changed elsewhere. Reload the library list, keeping your draft, and save again.",
        ));
    }
    value["entries"].as_array_mut().unwrap().push(entry);
    value["_version"] = json!(
        version
            .checked_add(1)
            .ok_or((StatusCode::CONFLICT, "Pattern library version overflow"))?
    );
    validate(&value).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    let path = app.path.parent().unwrap().join("projects").join(FILE);
    let tmp = path.with_extension("tmp");
    tokio::fs::write(&tmp, serde_json::to_vec(&value).unwrap())
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Pattern library save failed",
            )
        })?;
    tokio::fs::rename(tmp, path).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Pattern library save failed",
        )
    })?;
    Ok(response(value))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn library_rejects_overwriting_starters_names_ids_and_invalid_cells() {
        for p in starters() {
            validate_entry(&p).unwrap();
        }
        let mut entry = starters()[0].clone();
        entry["id"] = json!("user-one");
        entry["name"] = json!("My swatch");
        let mut library = json!({"schema":1,"id":"_patterns","entries":[entry.clone()]});
        assert!(validate(&library).is_ok());
        library["entries"]
            .as_array_mut()
            .unwrap()
            .push(entry.clone());
        assert!(validate(&library).is_err());
        library["entries"] = json!([entry]);
        library["entries"][0]["name"] = json!("  SINGLE CROCHET ROWS ");
        assert!(validate(&library).is_err());
        library["entries"][0]["cells"][0] = json!("missing");
        assert!(validate(&library).is_err());
    }
}
