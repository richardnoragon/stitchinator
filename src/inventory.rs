use crate::App;
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
type Error = (StatusCode, &'static str);
pub const FILE: &str = "_inventory.json";
#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Yarn {
    id: String,
    name: String,
    brand: String,
    product: String,
    fiber: String,
    color: String,
    dye_lot: String,
    category: String,
    shape: String,
    size_mm: Option<f64>,
    thickness_mm: Option<f64>,
    skein_grams: f64,
    skein_meters: f64,
    remaining_grams: f64,
    cost: Option<f64>,
    currency: String,
    notes: String,
}
pub fn validate(value: &Value) -> Result<(), &'static str> {
    if value["schema"] != 1 || value["id"] != "_inventory" {
        return Err("Invalid inventory format");
    }
    let items: Vec<Yarn> =
        serde_json::from_value(value["items"].clone()).map_err(|_| "Invalid yarn fields")?;
    if items.len() > 1000 {
        return Err("Inventory supports up to 1000 yarn lots");
    }
    let mut ids = std::collections::HashSet::new();
    for y in items {
        if y.id.is_empty()
            || y.id.len() > 64
            || !y.id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
            || !ids.insert(y.id.clone())
        {
            return Err("Invalid or duplicate yarn ID");
        }
        if y.name.trim().is_empty()
            || y.name.len() > 200
            || [
                &y.brand,
                &y.product,
                &y.fiber,
                &y.color,
                &y.dye_lot,
                &y.category,
            ]
            .iter()
            .any(|s| s.len() > 200)
            || y.notes.len() > 2000
        {
            return Err("Enter a name and keep yarn text within limits");
        }
        if !matches!(y.shape.as_str(), "round" | "flat") {
            return Err("Choose round or flat yarn");
        }
        if [y.skein_grams, y.skein_meters]
            .iter()
            .any(|v| !v.is_finite() || *v <= 0.0 || *v > 1_000_000.0)
            || !y.remaining_grams.is_finite()
            || !(0.0..=1_000_000.0).contains(&y.remaining_grams)
        {
            return Err(
                "Enter positive skein specifications and nonnegative remaining grams (maximum 1000000)",
            );
        }
        if [y.size_mm, y.thickness_mm]
            .into_iter()
            .flatten()
            .any(|v| !v.is_finite() || v <= 0.0 || v > 1000.0)
        {
            return Err("Yarn dimensions must be positive millimeters, at most 1000");
        }
        if y.shape == "round" && y.thickness_mm.is_some() {
            return Err("Thickness applies to flat yarn only");
        }
        if y.cost
            .is_some_and(|v| !v.is_finite() || !(0.0..=1_000_000.0).contains(&v))
            || (!y.currency.is_empty()
                && (y.currency.len() != 3 || !y.currency.bytes().all(|c| c.is_ascii_uppercase())))
            || (y.cost.is_some() && y.currency.is_empty())
        {
            return Err("Optional cost needs a three-letter currency code");
        }
    }
    crate::consumption::validate(value)?;
    Ok(())
}
pub(crate) async fn read(app: &App) -> Result<Value, Error> {
    match tokio::fs::read(app.path.parent().unwrap().join("projects").join(FILE)).await {
        Ok(bytes) => {
            let v: Value = serde_json::from_slice(&bytes)
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Unreadable inventory"))?;
            validate(&v)
                .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid saved inventory"))?;
            Ok(v)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            Ok(json!({"schema":1,"id":"_inventory","_version":0,"items":[]}))
        }
        Err(_) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            "Unable to read inventory",
        )),
    }
}
pub async fn get(State(app): State<App>) -> Result<Json<Value>, Error> {
    let _guard = app.lock.lock().await;
    read(&app).await.map(Json)
}
pub async fn put(
    State(app): State<App>,
    headers: HeaderMap,
    Json(mut value): Json<Value>,
) -> Result<Json<Value>, Error> {
    if headers.get("x-stitchinator").and_then(|v| v.to_str().ok()) != Some("1") {
        return Err((StatusCode::FORBIDDEN, "Missing application header"));
    }
    validate(&value).map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    let _guard = app.lock.lock().await;
    let previous = read(&app).await?;
    let version = previous["_version"].as_u64().unwrap_or(0);
    if headers
        .get("x-inventory-version")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        != Some(version)
    {
        return Err((
            StatusCode::CONFLICT,
            "Inventory changed elsewhere. Download your draft, then reload inventory before saving.",
        ));
    }
    value.as_object_mut().unwrap().remove("consumption");
    if let Some(ledger) = previous.get("consumption") {
        value["consumption"] = ledger.clone();
    }
    if previous["consumption"]
        .as_array()
        .into_iter()
        .flatten()
        .any(|e| {
            !value["items"]
                .as_array()
                .unwrap()
                .iter()
                .any(|y| y["id"] == e["lot_id"])
        })
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "Cannot remove a yarn lot referenced by consumption history",
        ));
    }
    value["_version"] = json!(version + 1);
    if serde_json::to_vec(&value).unwrap().len() > 2 * 1024 * 1024 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Inventory and history exceed the 2 MB limit",
        ));
    }
    let path = app.path.parent().unwrap().join("projects").join(FILE);
    let tmp = path.with_extension("tmp");
    tokio::fs::write(&tmp, serde_json::to_vec(&value).unwrap())
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Inventory save failed"))?;
    tokio::fs::rename(tmp, path)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Inventory save failed"))?;
    Ok(Json(value))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_inventory_bounds_and_lot_identity() {
        let mut v = json!({"schema":1,"id":"_inventory","items":[{"id":"lot-1","name":"Cotton","brand":"","product":"","fiber":"cotton","color":"blue","dye_lot":"123","category":"DK","shape":"round","size_mm":2.0,"thickness_mm":null,"skein_grams":50,"skein_meters":120,"remaining_grams":25,"cost":null,"currency":"","notes":""}]});
        assert!(validate(&v).is_ok());
        v["items"][0]["remaining_grams"] = json!(-1);
        assert!(validate(&v).is_err());
        v["items"][0]["remaining_grams"] = json!(0);
        assert!(validate(&v).is_ok());
        let copy = v["items"][0].clone();
        v["items"].as_array_mut().unwrap().push(copy);
        assert!(validate(&v).is_err());
    }
}
