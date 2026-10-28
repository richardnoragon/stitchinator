use crate::App;
use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use serde_json::{Value, json};
type Error = (StatusCode, &'static str);
fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 64 && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
}
fn project_path(app: &App, id: &str) -> Result<std::path::PathBuf, Error> {
    if !valid_id(id) {
        return Err((StatusCode::BAD_REQUEST, "Invalid project ID"));
    }
    Ok(app
        .path
        .parent()
        .unwrap()
        .join("projects")
        .join(format!("{id}.json")))
}
pub async fn migrate(dir: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    tokio::fs::create_dir_all(dir.join("projects")).await?;
    let target = dir.join("projects/legacy.json");
    if !tokio::fs::try_exists(dir.join("library-initialized")).await?
        && !tokio::fs::try_exists(&target).await?
        && tokio::fs::try_exists(dir.join("project.json")).await?
    {
        let original = tokio::fs::read(dir.join("project.json")).await?;
        let mut value: Value = serde_json::from_slice(&original)?;
        if !matches!(value.get("schema").and_then(Value::as_u64), Some(1 | 2)) {
            return Err("Unsupported legacy project".into());
        }
        value["id"] = json!("legacy");
        let tmp = target.with_extension("tmp");
        tokio::fs::write(&tmp, serde_json::to_vec(&value)?).await?;
        tokio::fs::rename(tmp, target).await?;
    }
    tokio::fs::write(dir.join("library-initialized"), b"1").await?;
    Ok(())
}
pub async fn list(State(app): State<App>) -> Result<Json<Value>, Error> {
    let _guard = app.lock.lock().await;
    let mut entries = tokio::fs::read_dir(app.path.parent().unwrap().join("projects"))
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Unable to list projects"))?;
    let mut result = Vec::new();
    while let Some(entry) = entries
        .next_entry()
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Unable to list projects"))?
    {
        if entry.file_name() == crate::inventory::FILE || entry.file_name() == crate::patterns::FILE
        {
            continue;
        }
        if entry.path().extension().and_then(|s| s.to_str()) != Some("json") {
            continue;
        }
        let data = tokio::fs::read(entry.path()).await.map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Unable to read project list",
            )
        })?;
        let p: Value = serde_json::from_slice(&data).map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "A saved project is unreadable; restore its backup before continuing",
            )
        })?;
        result.push(json!({"id":p["id"],"name":p["fields"]["name"],"description":p.get("description").unwrap_or(&json!("")),"tags":p.get("tags").unwrap_or(&json!([])),"folder":p.get("folder").unwrap_or(&json!(""))}));
    }
    Ok(Json(json!(result)))
}
pub async fn get(State(app): State<App>, Path(id): Path<String>) -> Result<Json<Value>, Error> {
    let path = project_path(&app, &id)?;
    let _guard = app.lock.lock().await;
    let bytes = tokio::fs::read(path).await.map_err(|e| {
        if e.kind() == std::io::ErrorKind::NotFound {
            (StatusCode::NOT_FOUND, "Project not found")
        } else {
            (StatusCode::INTERNAL_SERVER_ERROR, "Unable to read project")
        }
    })?;
    serde_json::from_slice(&bytes)
        .map(Json)
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid saved project"))
}
pub async fn put(
    State(app): State<App>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Json(mut value): Json<Value>,
) -> Result<Json<Value>, Error> {
    let path = project_path(&app, &id)?;
    if headers.get("x-stitchinator").and_then(|h| h.to_str().ok()) != Some("1") {
        return Err((StatusCode::FORBIDDEN, "Missing application header"));
    }
    if !matches!(value.get("schema").and_then(Value::as_u64), Some(1 | 2))
        || value.get("id").and_then(Value::as_str) != Some(&id)
    {
        return Err((StatusCode::BAD_REQUEST, "Project identity mismatch"));
    }
    let _guard = app.lock.lock().await;
    let previous = match tokio::fs::read(&path).await {
        Ok(bytes) => serde_json::from_slice::<Value>(&bytes)
            .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Invalid saved project"))?,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => json!({}),
        Err(_) => return Err((StatusCode::INTERNAL_SERVER_ERROR, "Unable to read project")),
    };
    if previous.get("schema").and_then(Value::as_u64) == Some(2)
        && value.get("schema").and_then(Value::as_u64) == Some(1)
    {
        return Err((
            StatusCode::CONFLICT,
            "This project now has pieces. Download unsaved work and refresh this older tab before saving.",
        ));
    }
    let version = previous
        .get("_version")
        .and_then(Value::as_u64)
        .unwrap_or(0);
    let expected = headers
        .get("x-project-version")
        .and_then(|s| s.to_str().ok())
        .and_then(|s| s.parse::<u64>().ok());
    if expected != Some(version) {
        return Err((
            StatusCode::CONFLICT,
            "Project changed in another tab. Download your edits, then reload before saving.",
        ));
    }
    // Operational reservations can only change through the reviewed reservation endpoint.
    for key in ["lifecycle", "reservation"] {
        value.as_object_mut().unwrap().remove(key);
        if let Some(saved) = previous.get(key) {
            value[key] = saved.clone();
        }
    }
    value["_version"] = json!(version + 1);
    let data =
        serde_json::to_vec(&value).map_err(|_| (StatusCode::BAD_REQUEST, "Invalid project"))?;
    let tmp = path.with_extension("tmp");
    tokio::fs::write(&tmp, data)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Save failed"))?;
    tokio::fs::rename(tmp, path)
        .await
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Save failed"))?;
    Ok(Json(json!({"version":version+1})))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_path_traversal() {
        assert!(!valid_id("../project"));
        assert!(!valid_id("a/b"));
        assert!(!valid_id(""));
        assert!(valid_id("legacy"));
        assert!(valid_id("1234-abcd"));
    }
    #[tokio::test]
    async fn migration_preserves_original_and_is_idempotent() {
        let dir = std::env::temp_dir().join(format!("stitchinator-migrate-{}", std::process::id()));
        tokio::fs::create_dir_all(&dir).await.unwrap();
        let old =
            br#"{"schema":1,"fields":{"name":"Old scarf"},"revisions":[{"name":"Original"}]}"#;
        tokio::fs::write(dir.join("project.json"), old)
            .await
            .unwrap();
        migrate(&dir).await.unwrap();
        let path = dir.join("projects/legacy.json");
        let mut p: Value = serde_json::from_slice(&tokio::fs::read(&path).await.unwrap()).unwrap();
        assert_eq!(p["id"], "legacy");
        assert_eq!(p["revisions"][0]["name"], "Original");
        p["fields"]["name"] = json!("Edited");
        tokio::fs::write(&path, serde_json::to_vec(&p).unwrap())
            .await
            .unwrap();
        migrate(&dir).await.unwrap();
        assert_eq!(
            serde_json::from_slice::<Value>(&tokio::fs::read(path).await.unwrap()).unwrap()["fields"]
                ["name"],
            "Edited"
        );
        assert_eq!(
            tokio::fs::read(dir.join("project.json")).await.unwrap(),
            old
        );
        tokio::fs::remove_dir_all(dir).await.unwrap();
    }
}
