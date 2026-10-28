use crate::App;
use axum::{
    Json,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
};
use chrono::Local;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    fs,
    path::{Path as FsPath, PathBuf},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
type Files = BTreeMap<String, Value>;
type Result<T> = std::result::Result<T, String>;
#[derive(Clone)]
pub struct Store {
    pub root: Option<PathBuf>,
    pub error: Arc<Mutex<Option<String>>>,
}
impl Store {
    pub fn new(root: Option<PathBuf>) -> Self {
        Self {
            root,
            error: Arc::new(Mutex::new(None)),
        }
    }
}
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Point {
    schema: u32,
    id: String,
    created: String,
    day: String,
    month: String,
    kind: String,
    parent: Option<String>,
    files: Files,
    deleted: Vec<String>,
}
#[derive(Serialize, Deserialize)]
struct Envelope {
    payload: Point,
    sha256: String,
}
fn io(e: impl std::fmt::Display) -> String {
    e.to_string()
}
fn stamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos() as u64
}
fn valid_file(name: &str) -> bool {
    if name == crate::inventory::FILE || name == crate::patterns::FILE {
        return true;
    }
    name.strip_suffix(".json").is_some_and(|id| {
        !id.is_empty()
            && id.len() <= 64
            && id.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'-')
    })
}
fn root(store: &Store) -> Result<&FsPath> {
    let root=store.root.as_deref().ok_or("Backup folder is not configured. Set STITCHINATOR_BACKUPS to a prepared folder outside application data.")?;
    if fs::read_to_string(root.join(".stitchinator-backups"))
        .map_err(|_| {
            "Backup destination unavailable: its marker file is missing or unreadable.".to_string()
        })?
        .trim()
        != "stitchinator-backups-v1"
    {
        return Err("Backup destination marker is invalid.".into());
    }
    Ok(root)
}
fn write_atomic(path: &FsPath, bytes: &[u8]) -> Result<()> {
    use std::io::Write;
    let tmp = path.with_extension("tmp");
    let mut file = fs::File::create(&tmp).map_err(io)?;
    file.write_all(bytes).map_err(io)?;
    file.sync_all().map_err(io)?;
    fs::rename(&tmp, path).map_err(io)?;
    fs::File::open(path.parent().unwrap())
        .and_then(|d| d.sync_all())
        .map_err(io)
}
fn checksum(p: &Point) -> Result<String> {
    Ok(format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(p).map_err(io)?)
    ))
}
fn validate_files(files: &Files) -> Result<()> {
    for (name, p) in files {
        if name == crate::patterns::FILE {
            crate::patterns::validate(p).map_err(str::to_string)?;
            continue;
        }
        if name == crate::inventory::FILE {
            crate::inventory::validate(p).map_err(str::to_string)?;
            continue;
        }
        if !valid_file(name)
            || !matches!(p.get("schema").and_then(Value::as_u64), Some(1 | 2))
            || p.get("id").and_then(Value::as_str) != name.strip_suffix(".json")
        {
            return Err("Backup contains an invalid project identity.".into());
        }
    }
    Ok(())
}
fn current(data: &FsPath) -> Result<Files> {
    let mut files = Files::new();
    for entry in fs::read_dir(data.join("projects")).map_err(io)? {
        let entry = entry.map_err(io)?;
        let name = entry.file_name().to_string_lossy().to_string();
        if !name.ends_with(".json") {
            continue;
        }
        let p = serde_json::from_slice(&fs::read(entry.path()).map_err(io)?).map_err(io)?;
        files.insert(name, p);
    }
    validate_files(&files)?;
    Ok(files)
}
fn month_ok(s: &str) -> bool {
    s.len() == 7 && chrono::NaiveDate::parse_from_str(&format!("{s}-01"), "%Y-%m-%d").is_ok()
}
fn read_points(store: &Store) -> Result<Vec<Point>> {
    let mut points = Vec::new();
    for entry in fs::read_dir(root(store)?).map_err(io)? {
        let entry = entry.map_err(io)?;
        let month = entry.file_name().to_string_lossy().to_string();
        if !month_ok(&month) || !entry.file_type().map_err(io)?.is_dir() {
            continue;
        }
        for file in fs::read_dir(entry.path()).map_err(io)? {
            let file = file.map_err(io)?;
            if file.path().extension().and_then(|e| e.to_str()) != Some("json") {
                continue;
            }
            let envelope: Envelope =
                serde_json::from_slice(&fs::read(file.path()).map_err(io)?).map_err(io)?;
            let p = envelope.payload;
            if p.schema != 1
                || p.month != month
                || p.day.get(..7) != Some(&month)
                || !p.id.bytes().all(|b| b.is_ascii_digit())
                || p.id.is_empty()
                || file.file_name().to_string_lossy() != format!("{}.json", p.id)
                || envelope.sha256 != checksum(&p)?
                || !matches!(p.kind.as_str(), "full" | "incremental" | "safety")
            {
                return Err("Backup validation failed. No data was restored or pruned.".into());
            }
            validate_files(&p.files)?;
            if p.deleted.iter().any(|s| !valid_file(s)) {
                return Err("Invalid deletion record.".into());
            }
            points.push(p);
        }
    }
    points.sort_by(|a, b| a.id.cmp(&b.id));
    Ok(points)
}
fn reconstruct(points: &[Point], id: &str) -> Result<Files> {
    let mut chain = Vec::new();
    let mut next = Some(id.to_string());
    let mut seen = BTreeSet::new();
    while let Some(id) = next {
        if !seen.insert(id.clone()) {
            return Err("Backup dependency cycle.".into());
        }
        let p = points
            .iter()
            .find(|p| p.id == id)
            .ok_or("A required backup is missing.")?;
        chain.push(p);
        if p.kind == "incremental" {
            next = Some(
                p.parent
                    .clone()
                    .ok_or("Incremental backup has no parent.")?,
            );
        } else {
            if p.parent.is_some() {
                return Err("Full backup has unexpected parent.".into());
            }
            next = None;
        }
    }
    let mut files = Files::new();
    for p in chain.into_iter().rev() {
        for name in &p.deleted {
            files.remove(name);
        }
        files.extend(p.files.clone());
    }
    validate_files(&files)?;
    Ok(files)
}
fn due_kind(points: &[Point], day: &str) -> Option<&'static str> {
    let month = &day[..7];
    let latest = points.iter().rev().find(|p| p.kind != "safety");
    match latest {
        None => Some("full"),
        Some(p) if p.month != month => Some("full"),
        Some(p) if p.day.as_str() < day => Some("incremental"),
        _ => None,
    }
}
fn prune(store: &Store, points: &[Point]) -> Result<()> {
    let months: BTreeSet<_> = points.iter().map(|p| p.month.clone()).collect();
    let remove = months.len().saturating_sub(3);
    for month in months.into_iter().take(remove) {
        fs::remove_dir_all(root(store)?.join(month)).map_err(io)?;
    }
    Ok(())
}
fn make_backup(
    store: &Store,
    data: &FsPath,
    day: &str,
    safety: bool,
    manual: bool,
) -> Result<Option<Point>> {
    let root = root(store)?.to_path_buf();
    if root
        .canonicalize()
        .map_err(io)?
        .starts_with(data.canonicalize().map_err(io)?)
    {
        return Err("Backups must be outside the application data directory.".into());
    }
    let points = read_points(store)?;
    let due = due_kind(&points, day);
    if !safety && !manual && due.is_none() {
        return Ok(None);
    }
    let kind = if safety {
        "safety"
    } else {
        due.unwrap_or("incremental")
    };
    let now = current(data)?;
    let mut parent = None;
    let mut files = now.clone();
    let mut deleted = Vec::new();
    if kind == "incremental" {
        let last = points
            .iter()
            .rev()
            .find(|p| p.kind != "safety")
            .ok_or("Missing full backup.")?;
        let before = reconstruct(&points, &last.id)?;
        files.retain(|k, v| before.get(k) != Some(v));
        deleted = before
            .keys()
            .filter(|k| !now.contains_key(*k))
            .cloned()
            .collect();
        parent = Some(last.id.clone());
    }
    let point = Point {
        schema: 1,
        id: stamp().to_string(),
        created: Local::now().to_rfc3339(),
        day: day.into(),
        month: day[..7].into(),
        kind: kind.into(),
        parent,
        files,
        deleted,
    };
    let dir = root.join(&point.month);
    fs::create_dir_all(&dir).map_err(io)?;
    let envelope = Envelope {
        sha256: checksum(&point)?,
        payload: point.clone(),
    };
    write_atomic(
        &dir.join(format!("{}.json", point.id)),
        &serde_json::to_vec(&envelope).map_err(io)?,
    )?;
    if !safety {
        let mut all = points;
        all.push(point.clone());
        prune(store, &all)?;
    }
    Ok(Some(point))
}
pub fn recover(data: &FsPath) -> Result<()> {
    let previous = data.join("restore-previous");
    let projects = data.join("projects");
    if previous.exists() {
        if projects.exists() {
            fs::remove_dir_all(&previous).map_err(io)?;
        } else {
            fs::rename(&previous, &projects).map_err(io)?;
        }
    }
    let stage = data.join("restore-stage");
    if stage.exists() {
        fs::remove_dir_all(stage).map_err(io)?;
    }
    Ok(())
}
fn restore(store: &Store, data: &FsPath, id: &str) -> Result<String> {
    let points = read_points(store)?;
    let mut files = reconstruct(&points, id)?;
    let before = current(data)?;
    let floor = before
        .values()
        .chain(files.values())
        .filter_map(|v| v.get("_version").and_then(Value::as_u64))
        .max()
        .unwrap_or(0)
        .max(stamp() / 1_000_000)
        .checked_add(1)
        .ok_or("Version overflow")?;
    let day = Local::now().format("%Y-%m-%d").to_string();
    let safety = make_backup(store, data, &day, true, true)?.ok_or("Safety backup failed")?;
    recover(data)?;
    let stage = data.join("restore-stage");
    fs::create_dir(&stage).map_err(io)?;
    for (name, p) in &mut files {
        p["_version"] = json!(floor);
        write_atomic(&stage.join(name), &serde_json::to_vec(p).map_err(io)?)?;
    }
    let projects = data.join("projects");
    let previous = data.join("restore-previous");
    fs::rename(&projects, &previous).map_err(io)?;
    if let Err(e) = fs::rename(&stage, &projects) {
        fs::rename(&previous, &projects).map_err(io)?;
        return Err(io(e));
    }
    fs::File::open(data)
        .and_then(|d| d.sync_all())
        .map_err(io)?;
    fs::remove_dir_all(previous).map_err(io)?;
    Ok(safety.id)
}
fn authorize(headers: &HeaderMap) -> std::result::Result<(), (StatusCode, String)> {
    if headers.get("x-stitchinator").and_then(|s| s.to_str().ok()) != Some("1") {
        Err((StatusCode::FORBIDDEN, "Missing application header".into()))
    } else {
        Ok(())
    }
}
fn result<T>(app: &App, value: Result<T>) -> std::result::Result<T, (StatusCode, String)> {
    match value {
        Ok(v) => {
            *app.backups.error.lock().unwrap() = None;
            Ok(v)
        }
        Err(e) => {
            *app.backups.error.lock().unwrap() = Some(e.clone());
            Err((StatusCode::INTERNAL_SERVER_ERROR, e))
        }
    }
}
pub async fn status(State(app): State<App>) -> Json<Value> {
    let _guard = app.lock.lock().await;
    let day = Local::now().format("%Y-%m-%d").to_string();
    match read_points(&app.backups) {
        Ok(points) => {
            let due = due_kind(&points, &day);
            let summaries:Vec<_>=points.iter().rev().map(|p|json!({"id":p.id,"created":p.created,"kind":p.kind,"projects_changed":p.files.len()})).collect();
            Json(
                json!({"configured":app.backups.root.is_some(),"destination":app.backups.root,"local_time":Local::now().to_rfc3339(),"overdue":due.is_some(),"next_kind":due,"last_success":points.last().map(|p|&p.created),"error":app.backups.error.lock().unwrap().clone(),"points":summaries}),
            )
        }
        Err(e) => Json(
            json!({"configured":app.backups.root.is_some(),"destination":app.backups.root,"local_time":Local::now().to_rfc3339(),"overdue":true,"error":e,"points":[]}),
        ),
    }
}
pub async fn run(
    State(app): State<App>,
    headers: HeaderMap,
) -> std::result::Result<Json<Value>, (StatusCode, String)> {
    authorize(&headers)?;
    let _guard = app.lock.lock().await;
    let day = Local::now().format("%Y-%m-%d").to_string();
    let p = result(
        &app,
        make_backup(&app.backups, app.path.parent().unwrap(), &day, false, true),
    )?;
    Ok(Json(json!({"backup":p.map(|p|p.id)})))
}
pub async fn restore_route(
    State(app): State<App>,
    Path(id): Path<String>,
    headers: HeaderMap,
) -> std::result::Result<Json<Value>, (StatusCode, String)> {
    authorize(&headers)?;
    if headers
        .get("x-confirm-restore")
        .and_then(|s| s.to_str().ok())
        != Some("replace-collection")
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "Explicit collection restore confirmation required".into(),
        ));
    }
    let _guard = app.lock.lock().await;
    let safety = result(&app, restore(&app.backups, app.path.parent().unwrap(), &id))?;
    Ok(Json(json!({"restored":id,"safety_backup":safety})))
}
pub async fn scheduler(app: App) {
    loop {
        if app.backups.root.is_some() {
            let _guard = app.lock.lock().await;
            let day = Local::now().format("%Y-%m-%d").to_string();
            let retry = app.backups.error.lock().unwrap().is_some();
            let _ = result(
                &app,
                make_backup(&app.backups, app.path.parent().unwrap(), &day, false, retry),
            );
        }
        tokio::time::sleep(std::time::Duration::from_secs(60)).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    struct Fixture {
        base: PathBuf,
        data: PathBuf,
        store: Store,
    }
    impl Fixture {
        fn new() -> Self {
            let base = std::env::temp_dir().join(format!("stitchinator-backup-{}", stamp()));
            let data = base.join("data");
            let backups = base.join("backups");
            fs::create_dir_all(data.join("projects")).unwrap();
            fs::create_dir_all(&backups).unwrap();
            fs::write(
                backups.join(".stitchinator-backups"),
                "stitchinator-backups-v1\n",
            )
            .unwrap();
            Self {
                base,
                data,
                store: Store::new(Some(backups)),
            }
        }
        fn project(&self, name: &str) {
            fs::write(self.data.join("projects/a.json"),serde_json::to_vec(&json!({"id":"a","schema":1,"fields":{"name":name},"_version":1,"revisions":[{"name":"Milestone"}]})).unwrap()).unwrap();
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.base);
        }
    }
    #[test]
    fn inventory_joins_backup_chain_and_old_restores() {
        let f = Fixture::new();
        f.project("A");
        let old = make_backup(&f.store, &f.data, "2026-10-01", false, false)
            .unwrap()
            .unwrap();
        let inventory = json!({"schema":1,"id":"_inventory","items":[],"_version":1});
        fs::write(
            f.data.join("projects").join(crate::inventory::FILE),
            serde_json::to_vec(&inventory).unwrap(),
        )
        .unwrap();
        let added = make_backup(&f.store, &f.data, "2026-10-02", false, false)
            .unwrap()
            .unwrap();
        assert!(
            reconstruct(&read_points(&f.store).unwrap(), &added.id)
                .unwrap()
                .contains_key(crate::inventory::FILE)
        );
        let safety = restore(&f.store, &f.data, &old.id).unwrap();
        assert!(
            !current(&f.data)
                .unwrap()
                .contains_key(crate::inventory::FILE)
        );
        assert!(
            reconstruct(&read_points(&f.store).unwrap(), &safety)
                .unwrap()
                .contains_key(crate::inventory::FILE)
        );
        make_backup(&f.store, &f.data, "2026-10-03", false, false).unwrap();
        assert!(read_points(&f.store).is_ok());
    }
    #[test]
    fn schedule_initial_daily_monthly_and_catchup() {
        let f = Fixture::new();
        f.project("A");
        assert_eq!(
            make_backup(&f.store, &f.data, "2024-02-28", false, false)
                .unwrap()
                .unwrap()
                .kind,
            "full"
        );
        assert!(
            make_backup(&f.store, &f.data, "2024-02-28", false, false)
                .unwrap()
                .is_none()
        );
        assert_eq!(
            make_backup(&f.store, &f.data, "2024-02-29", false, false)
                .unwrap()
                .unwrap()
                .kind,
            "incremental"
        );
        assert_eq!(
            make_backup(&f.store, &f.data, "2024-03-05", false, false)
                .unwrap()
                .unwrap()
                .kind,
            "full"
        );
        assert_eq!(
            make_backup(&f.store, &f.data, "2024-03-09", false, false)
                .unwrap()
                .unwrap()
                .kind,
            "incremental"
        );
        assert_eq!(read_points(&f.store).unwrap().len(), 4);
    }
    #[test]
    fn incremental_restore_safety_and_new_versions() {
        let f = Fixture::new();
        f.project("A");
        let full = make_backup(&f.store, &f.data, "2026-10-01", false, false)
            .unwrap()
            .unwrap();
        f.project("B");
        let inc = make_backup(&f.store, &f.data, "2026-10-02", false, false)
            .unwrap()
            .unwrap();
        let points = read_points(&f.store).unwrap();
        assert_eq!(
            reconstruct(&points, &inc.id).unwrap()["a.json"]["fields"]["name"],
            "B"
        );
        let safety = restore(&f.store, &f.data, &full.id).unwrap();
        let restored = current(&f.data).unwrap();
        assert_eq!(restored["a.json"]["fields"]["name"], "A");
        assert!(restored["a.json"]["_version"].as_u64().unwrap() > 1);
        assert!(restored["a.json"]["_version"].as_u64().unwrap() < 9_007_199_254_740_991);
        let before = reconstruct(&read_points(&f.store).unwrap(), &safety).unwrap();
        assert_eq!(before["a.json"]["fields"]["name"], "B");
        assert_eq!(before["a.json"]["revisions"][0]["name"], "Milestone");
    }
    #[test]
    fn deleted_projects_reconstruct_and_retention_keeps_chains() {
        let f = Fixture::new();
        f.project("A");
        for month in 1..=5 {
            make_backup(
                &f.store,
                &f.data,
                &format!("2026-{month:02}-01"),
                false,
                false,
            )
            .unwrap();
            make_backup(
                &f.store,
                &f.data,
                &format!("2026-{month:02}-02"),
                false,
                false,
            )
            .unwrap();
        }
        let points = read_points(&f.store).unwrap();
        assert_eq!(points.len(), 6);
        for p in &points {
            assert!(p.month.as_str() >= "2026-03");
            assert!(reconstruct(&points, &p.id).unwrap().contains_key("a.json"));
        }
        fs::remove_file(f.data.join("projects/a.json")).unwrap();
        let empty = make_backup(&f.store, &f.data, "2026-05-03", false, false)
            .unwrap()
            .unwrap();
        assert!(
            reconstruct(&read_points(&f.store).unwrap(), &empty.id)
                .unwrap()
                .is_empty()
        );
    }
    #[test]
    fn corrupt_or_missing_chain_cannot_replace_current() {
        let f = Fixture::new();
        f.project("A");
        let full = make_backup(&f.store, &f.data, "2026-10-01", false, false)
            .unwrap()
            .unwrap();
        f.project("B");
        let inc = make_backup(&f.store, &f.data, "2026-10-02", false, false)
            .unwrap()
            .unwrap();
        fs::remove_file(
            f.store
                .root
                .as_ref()
                .unwrap()
                .join("2026-10")
                .join(format!("{}.json", full.id)),
        )
        .unwrap();
        assert!(restore(&f.store, &f.data, &inc.id).is_err());
        assert_eq!(current(&f.data).unwrap()["a.json"]["fields"]["name"], "B");
        let path = f
            .store
            .root
            .as_ref()
            .unwrap()
            .join("2026-10")
            .join(format!("{}.json", inc.id));
        let mut v: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
        v["sha256"] = json!("invalid");
        fs::write(path, serde_json::to_vec(&v).unwrap()).unwrap();
        assert!(read_points(&f.store).is_err());
    }
    #[cfg(unix)]
    #[test]
    fn failed_safety_backup_leaves_projects_untouched() {
        use std::os::unix::fs::PermissionsExt;
        let f = Fixture::new();
        f.project("Original");
        let day = Local::now().format("%Y-%m-%d").to_string();
        let full = make_backup(&f.store, &f.data, &day, false, false)
            .unwrap()
            .unwrap();
        f.project("Current");
        let month = f.store.root.as_ref().unwrap().join(&day[..7]);
        fs::set_permissions(&month, fs::Permissions::from_mode(0o555)).unwrap();
        let outcome = restore(&f.store, &f.data, &full.id);
        fs::set_permissions(&month, fs::Permissions::from_mode(0o755)).unwrap();
        assert!(outcome.is_err());
        assert_eq!(
            current(&f.data).unwrap()["a.json"]["fields"]["name"],
            "Current"
        );
    }
    #[test]
    fn interrupted_restore_rolls_back_before_commit() {
        let f = Fixture::new();
        f.project("Original");
        fs::rename(f.data.join("projects"), f.data.join("restore-previous")).unwrap();
        fs::create_dir(f.data.join("restore-stage")).unwrap();
        recover(&f.data).unwrap();
        assert_eq!(
            current(&f.data).unwrap()["a.json"]["fields"]["name"],
            "Original"
        );
        assert!(!f.data.join("restore-stage").exists());
    }
    #[test]
    fn missing_destination_marker_does_not_get_recreated() {
        let f = Fixture::new();
        fs::remove_file(f.store.root.as_ref().unwrap().join(".stitchinator-backups")).unwrap();
        assert!(make_backup(&f.store, &f.data, "2026-10-01", false, false).is_err());
        assert!(!f.store.root.as_ref().unwrap().join("2026-10").exists());
    }
    #[test]
    fn shared_patterns_restore_with_collection_and_advance_versions() {
        let f = Fixture::new();
        f.project("A");
        let mut entry = crate::patterns::starters()[0].clone();
        entry["id"] = json!("saved-one");
        entry["name"] = json!("Saved sample");
        let library = json!({"schema":1,"id":"_patterns","_version":1,"entries":[entry]});
        let path = f.data.join("projects").join(crate::patterns::FILE);
        fs::write(&path, serde_json::to_vec(&library).unwrap()).unwrap();
        let point = make_backup(&f.store, &f.data, "2026-10-01", false, false)
            .unwrap()
            .unwrap();
        let mut later = library.clone();
        later["entries"][0]["instructions"] = json!("Later");
        fs::write(&path, serde_json::to_vec(&later).unwrap()).unwrap();
        restore(&f.store, &f.data, &point.id).unwrap();
        let restored = current(&f.data).unwrap();
        let restored = &restored[crate::patterns::FILE];
        assert_eq!(restored["entries"], library["entries"]);
        assert!(restored["_version"].as_u64().unwrap() > 1);
    }
}
